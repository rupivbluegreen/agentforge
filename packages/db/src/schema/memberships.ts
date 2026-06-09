import { pgTable, uuid, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { tenantColumns } from './_shared.js';

/** A user's role within a tenant (RBAC). Roles map to permissions in the OPA policy. */
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    userSub: text('user_sub').notNull(),
    role: text('role').notNull().default('member'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdIdx: index('memberships_tenant_id_idx').on(t.tenantId),
    userUnique: unique('memberships_unique').on(t.tenantId, t.userSub),
  }),
);

export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembershipRow = typeof memberships.$inferInsert;
