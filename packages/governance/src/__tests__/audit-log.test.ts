import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import * as schema from '@agentforge/db/schema';
import { loadMigrations, type Db } from '@agentforge/db';
import { AuditLog } from '../audit/audit-log.js';

describe('AuditLog (hash chain)', () => {
  let pg: PGlite;
  let audit: AuditLog;
  let tenantId: string;

  beforeAll(async () => {
    pg = new PGlite();
    const db = drizzle(pg, { schema }) as unknown as Db;
    for (const m of await loadMigrations()) await pg.exec(m.sql);
    tenantId = (
      await pg.query<{ id: string }>(
        `insert into tenants (slug, name) values ('a', 'A') returning id`,
      )
    ).rows[0]!.id;

    let clock = Date.parse('2026-01-01T00:00:00.000Z');
    audit = new AuditLog(db, () => new Date((clock += 1000)));

    await audit.append(tenantId, {
      actor: 'user:1',
      action: 'agent.created',
      resourceType: 'agent',
      resourceId: 'a1',
    });
    await audit.append(tenantId, {
      actor: 'user:1',
      action: 'agent.run',
      resourceType: 'run',
      resourceId: 'r1',
      details: { ok: true },
    });
    await audit.append(tenantId, {
      actor: 'user:1',
      action: 'agent.run',
      resourceType: 'run',
      resourceId: 'r2',
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('assigns a linear sequence and verifies intact', async () => {
    const entries = await audit.list(tenantId);
    expect(entries.map((e) => Number(e.seq))).toEqual([1, 2, 3]);
    const v = await audit.verifyChain(tenantId);
    expect(v).toEqual({ valid: true, entries: 3 });
  });

  it('detects tampering (hash chain breaks)', async () => {
    // Tamper directly (only possible here as the bootstrap superuser; the app role is
    // blocked by the append-only RLS policy).
    await pg.exec(`UPDATE audit_log SET action = 'HACKED' WHERE seq = 2`);
    const v = await audit.verifyChain(tenantId);
    expect(v.valid).toBe(false);
    expect(v.brokenAtSeq).toBe(2);
    expect(v.reason).toBe('hash mismatch');
  });
});
