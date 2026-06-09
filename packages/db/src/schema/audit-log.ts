import { pgTable, uuid, text, bigint, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { tenantColumns } from './_shared.js';

/**
 * Append-only, per-tenant hash-chained audit log (tamper-evident). Writers must use
 * the governance AuditLog service, which computes `seq`/`prevHash`/`hash`. The RLS
 * policies in the migration grant only SELECT + INSERT, so it is append-only even at
 * the database level.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    seq: bigint('seq', { mode: 'number' }).notNull(),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default({}),
    prevHash: text('prev_hash').notNull(),
    hash: text('hash').notNull(),
  },
  (t) => ({
    tenantSeqIdx: index('audit_log_tenant_seq_idx').on(t.tenantId, t.seq),
    seqUnique: unique('audit_log_seq_unique').on(t.tenantId, t.seq),
  }),
);

export type AuditLogRow = typeof auditLog.$inferSelect;
export type NewAuditLogRow = typeof auditLog.$inferInsert;
