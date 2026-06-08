import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import * as schema from '../schema/index.js';
import { workspaces } from '../schema/index.js';
import { withTenant, MissingTenantContextError } from '../tenant.js';
import { loadMigrations } from '../migrate.js';

/**
 * Proves tenant isolation is enforced at the DATABASE by Row-Level Security, not just
 * by application WHERE clauses. We run as a non-superuser role (`app_user`) because
 * Postgres superusers bypass RLS — exactly the role posture production must use.
 */
describe('tenant isolation (RLS)', () => {
  let pg: PGlite;
  let db: PgliteDatabase<typeof schema>;
  let tenantA: string;
  let tenantB: string;

  beforeAll(async () => {
    pg = new PGlite();
    db = drizzle(pg, { schema });

    // Apply migrations as the bootstrap superuser (they create + own the tables).
    for (const m of await loadMigrations()) {
      await pg.exec(m.sql);
    }

    // Seed two tenants in the (non-RLS) registry.
    tenantA = (
      await pg.query<{ id: string }>(
        `insert into tenants (slug, name) values ('a', 'Tenant A') returning id`,
      )
    ).rows[0]!.id;
    tenantB = (
      await pg.query<{ id: string }>(
        `insert into tenants (slug, name) values ('b', 'Tenant B') returning id`,
      )
    ).rows[0]!.id;

    // Drop into a non-superuser role so RLS actually applies to our queries.
    await pg.exec(`
      CREATE ROLE app_user NOLOGIN;
      GRANT USAGE ON SCHEMA public TO app_user;
      GRANT SELECT, INSERT, UPDATE, DELETE ON tenants, workspaces TO app_user;
      SET ROLE app_user;
    `);

    // Each tenant creates one workspace, each correctly scoped via withTenant().
    await withTenant(db, tenantA, (tx) =>
      tx.insert(workspaces).values({ tenantId: tenantA, name: 'A workspace' }),
    );
    await withTenant(db, tenantB, (tx) =>
      tx.insert(workspaces).values({ tenantId: tenantB, name: 'B workspace' }),
    );
  });

  afterAll(async () => {
    await pg.close();
  });

  it('only returns the active tenant’s rows', async () => {
    const aRows = await withTenant(db, tenantA, (tx) => tx.select().from(workspaces));
    expect(aRows).toHaveLength(1);
    expect(aRows[0]!.name).toBe('A workspace');

    const bRows = await withTenant(db, tenantB, (tx) => tx.select().from(workspaces));
    expect(bRows).toHaveLength(1);
    expect(bRows[0]!.name).toBe('B workspace');
  });

  it('rejects writing a row for a different tenant (WITH CHECK)', async () => {
    await expect(
      withTenant(db, tenantA, (tx) =>
        // Scoped to A, but trying to plant a row for B.
        tx.insert(workspaces).values({ tenantId: tenantB, name: 'cross-tenant write' }),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it('cannot update or read across tenants', async () => {
    // From A's context, attempt to rename ALL workspaces — RLS limits the scope to A.
    await withTenant(db, tenantA, (tx) => tx.update(workspaces).set({ name: 'renamed' }));
    const bRows = await withTenant(db, tenantB, (tx) => tx.select().from(workspaces));
    expect(bRows[0]!.name).toBe('B workspace'); // untouched
  });

  it('fails closed: no tenant context returns no rows', async () => {
    // Outside withTenant, the LOCAL GUC is unset, so the policy matches nothing.
    const leaked = await db.select().from(workspaces);
    expect(leaked).toHaveLength(0);
  });

  it('refuses to run with an invalid tenant id', async () => {
    await expect(withTenant(db, 'not-a-uuid', async () => undefined)).rejects.toBeInstanceOf(
      MissingTenantContextError,
    );
  });
});
