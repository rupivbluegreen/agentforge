import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';

/**
 * The tenant registry — the root of multi-tenancy. This table is intentionally
 * NOT tenant-scoped (it has no `tenant_id`): it *defines* the tenants. Access to
 * it is a control-plane/admin concern and is guarded at the application layer,
 * not by row-level security.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Tenant = typeof tenants.$inferSelect;
export type NewTenant = typeof tenants.$inferInsert;
