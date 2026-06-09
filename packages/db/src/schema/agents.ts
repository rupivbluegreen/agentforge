import { pgTable, uuid, text, integer, jsonb, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { tenantColumns } from './_shared.js';

/**
 * Current definition of each agent. `definition` holds the graph (typed by
 * @agentforge/agent-core at the application layer). `intendedPurpose` and `riskTier`
 * are EU AI Act metadata recorded from creation (Art 11/Annex IV, Art 6/Annex III).
 */
export const agents = pgTable(
  'agents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    name: text('name').notNull(),
    intendedPurpose: text('intended_purpose').notNull().default(''),
    riskTier: text('risk_tier').notNull().default('minimal'),
    currentVersion: integer('current_version').notNull().default(1),
    definition: jsonb('definition').$type<unknown>().notNull(),
    // Zero-trust lifecycle fields (Phase 2).
    status: text('status').notNull().default('draft'),
    egressAllowlist: jsonb('egress_allowlist').$type<string[]>().notNull().default([]),
    riskAssessment: jsonb('risk_assessment').$type<unknown>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ tenantIdIdx: index('agents_tenant_id_idx').on(t.tenantId) }),
);

/** Immutable snapshot of each agent version. */
export const agentVersions = pgTable(
  'agent_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ...tenantColumns,
    agentId: uuid('agent_id').notNull(),
    version: integer('version').notNull(),
    name: text('name').notNull(),
    intendedPurpose: text('intended_purpose').notNull(),
    riskTier: text('risk_tier').notNull(),
    definition: jsonb('definition').$type<unknown>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    tenantIdIdx: index('agent_versions_tenant_id_idx').on(t.tenantId),
    agentVersionUnique: unique('agent_versions_unique').on(t.agentId, t.version),
  }),
);

export type AgentRow = typeof agents.$inferSelect;
export type NewAgentRow = typeof agents.$inferInsert;
export type AgentVersionRow = typeof agentVersions.$inferSelect;
export type NewAgentVersionRow = typeof agentVersions.$inferInsert;
