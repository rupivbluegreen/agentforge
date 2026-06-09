import { pgTable, uuid, text, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { tenantColumns } from './_shared.js';

/** One row per agent execution; `traceId` links to the OpenTelemetry trace. */
export const runs = pgTable(
  'runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    agentId: uuid('agent_id').notNull(),
    agentVersion: integer('agent_version').notNull(),
    status: text('status').notNull().default('running'),
    input: jsonb('input').$type<unknown>(),
    output: jsonb('output').$type<unknown>(),
    traceId: text('trace_id'),
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => ({
    tenantIdIdx: index('runs_tenant_id_idx').on(t.tenantId),
    agentIdIdx: index('runs_agent_id_idx').on(t.agentId),
  }),
);

export type RunRow = typeof runs.$inferSelect;
export type NewRunRow = typeof runs.$inferInsert;
