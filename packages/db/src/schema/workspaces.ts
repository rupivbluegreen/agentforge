import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { tenantColumns } from './_shared.js';

/**
 * Workspaces are the first tenant-scoped domain table. Per the architecture, the
 * hierarchy is tenant → workspace → project. This table exists now mainly to prove
 * the tenancy primitive end to end (schema + RLS + `withTenant`).
 */
export const workspaces = pgTable(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    name: text('name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdIdx: index('workspaces_tenant_id_idx').on(t.tenantId),
  }),
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
