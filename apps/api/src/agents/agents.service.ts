import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import {
  withTenant,
  agents,
  agentVersions,
  type Db,
  type AgentRow,
  type AgentVersionRow,
} from '@agentforge/db';
import {
  parseAgentDefinition,
  AgentValidationError,
  type AgentDefinition,
} from '@agentforge/agent-core';
import { AuditLog } from '@agentforge/governance';
import { DB, AUDIT } from '../tokens.js';

export interface CreateAgentInput {
  name?: unknown;
  intendedPurpose?: unknown;
  riskTier?: unknown;
  definition?: unknown;
}

/** Build a validated AgentDefinition from request input (throws 400 on invalid). */
function toDefinition(input: CreateAgentInput): AgentDefinition {
  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw new BadRequestException('name is required');
  }
  try {
    return parseAgentDefinition({
      name: input.name.trim(),
      intendedPurpose: typeof input.intendedPurpose === 'string' ? input.intendedPurpose : '',
      riskTier: typeof input.riskTier === 'string' ? input.riskTier : 'minimal',
      graph: input.definition,
    });
  } catch (err) {
    if (err instanceof AgentValidationError) throw new BadRequestException(err.message);
    throw err;
  }
}

@Injectable()
export class AgentsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(AUDIT) private readonly audit: AuditLog,
  ) {}

  async create(tenantId: string, actor: string, input: CreateAgentInput): Promise<AgentRow> {
    const def = toDefinition(input);
    const agent = await withTenant(this.db, tenantId, async (tx) => {
      const [created] = await tx
        .insert(agents)
        .values({
          tenantId,
          name: def.name,
          intendedPurpose: def.intendedPurpose,
          riskTier: def.riskTier,
          currentVersion: 1,
          definition: def.graph,
        })
        .returning();
      await tx.insert(agentVersions).values({
        tenantId,
        agentId: created!.id,
        version: 1,
        name: def.name,
        intendedPurpose: def.intendedPurpose,
        riskTier: def.riskTier,
        definition: def.graph,
      });
      return created!;
    });

    await this.audit.append(tenantId, {
      actor,
      action: 'agent.created',
      resourceType: 'agent',
      resourceId: agent.id,
      details: { name: def.name, riskTier: def.riskTier },
    });
    return agent;
  }

  list(tenantId: string): Promise<AgentRow[]> {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(agents).orderBy(desc(agents.createdAt)),
    );
  }

  async get(tenantId: string, id: string): Promise<AgentRow> {
    const [agent] = await withTenant(this.db, tenantId, (tx) =>
      tx.select().from(agents).where(eq(agents.id, id)).limit(1),
    );
    if (!agent) throw new NotFoundException(`agent ${id} not found`);
    return agent;
  }

  listVersions(tenantId: string, id: string): Promise<AgentVersionRow[]> {
    return withTenant(this.db, tenantId, (tx) =>
      tx
        .select()
        .from(agentVersions)
        .where(eq(agentVersions.agentId, id))
        .orderBy(desc(agentVersions.version)),
    );
  }
}
