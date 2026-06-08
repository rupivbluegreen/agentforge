import { uuid } from 'drizzle-orm/pg-core';
import { tenants } from './tenants.js';

/**
 * Tenant-scoping column set. EVERY tenant-scoped table must spread this into its
 * definition:
 *
 * ```ts
 * export const workspaces = pgTable('workspaces', {
 *   id: uuid('id').primaryKey().defaultRandom(),
 *   ...tenantColumns,
 *   // ...
 * });
 * ```
 *
 * This guarantees a NOT NULL `tenant_id` foreign key to the tenant registry — the
 * application-layer half of our two-layer isolation. The other half is the Postgres
 * Row-Level Security policy applied per table in the migrations (see
 * `migrations/0001_init.sql`), which enforces isolation even against raw SQL.
 */
export const tenantColumns = {
  tenantId: uuid('tenant_id')
    .notNull()
    .references(() => tenants.id, { onDelete: 'cascade' }),
};
