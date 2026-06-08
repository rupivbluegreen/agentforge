# @agentforge/db

Tenant-scoped Postgres schema, migrations, and the **multi-tenant isolation
primitive** for agentforge.

## Two layers of tenant isolation

Isolation is enforced twice, defense-in-depth:

1. **Application layer** — every tenant-scoped table spreads `tenantColumns` (a
   `NOT NULL tenant_id` FK to `tenants`). You touch those tables only through
   `withTenant()`, which opens a transaction and sets the tenant context. There is no
   easy way to run an unscoped query by accident.
2. **Database layer (authoritative)** — every tenant-scoped table has a **Row-Level
   Security** policy keyed to the `app.current_tenant` session variable, with
   `FORCE ROW LEVEL SECURITY`. Even hand-written raw SQL cannot read or write another
   tenant's rows. Isolation **fails closed**: with no tenant context set, zero rows
   are visible and inserts are rejected.

```ts
import { createDb, withTenant, workspaces } from '@agentforge/db';

const db = createDb(process.env.DATABASE_URL!);

await withTenant(db, tenantId, async (tx) => {
  await tx.insert(workspaces).values({ tenantId, name: 'My workspace' });
  return tx.select().from(workspaces); // only this tenant's rows
});
```

## Production role requirements

Postgres **superusers and `BYPASSRLS` roles bypass RLS**. The application MUST connect
as a dedicated, non-superuser, non-`BYPASSRLS` role that does **not** own the tables.
Run migrations as a separate, more-privileged migration role. See `client.ts` and
`migrate.ts`.

## Migrations

Plain, ordered SQL files in `migrations/` (e.g. `0001_init.sql`), applied by a small
idempotent runner that tracks state in `_af_migrations`:

```bash
DATABASE_MIGRATION_URL=postgres://... pnpm --filter @agentforge/db migrate
```

RLS policies and `FORCE` are part of the migration SQL (not just the ORM schema), so
the security control lives with the table definition.

## Tests

`vitest run` spins up an in-process Postgres ([PGlite](https://pglite.dev/)), applies
the migrations, switches to a non-superuser role, and proves the **negative path**:
cross-tenant reads return nothing and cross-tenant writes are rejected.
