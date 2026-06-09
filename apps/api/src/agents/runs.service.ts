import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { eq, desc } from 'drizzle-orm';
import { withTenant, agents, runs, type Db, type RunRow } from '@agentforge/db';
import { executeAgent, parseAgentDefinition, type RunStep } from '@agentforge/agent-core';
import type { ProviderRegistry } from '@agentforge/providers';
import type { ToolRegistry } from '@agentforge/tools';
import { AuditLog } from '@agentforge/governance';
import { logger } from '@agentforge/telemetry';
import { DB, PROVIDERS, TOOLS, AUDIT } from '../tokens.js';

export interface RunOutcome {
  runId: string;
  status: 'succeeded' | 'failed';
  traceId?: string;
  output?: unknown;
  steps?: RunStep[];
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

@Injectable()
export class RunsService {
  constructor(
    @Inject(DB) private readonly db: Db,
    @Inject(PROVIDERS) private readonly providers: ProviderRegistry,
    @Inject(TOOLS) private readonly tools: ToolRegistry,
    @Inject(AUDIT) private readonly audit: AuditLog,
  ) {}

  async run(tenantId: string, actor: string, agentId: string, input: unknown): Promise<RunOutcome> {
    const [agent] = await withTenant(this.db, tenantId, (tx) =>
      tx.select().from(agents).where(eq(agents.id, agentId)).limit(1),
    );
    if (!agent) throw new NotFoundException(`agent ${agentId} not found`);

    // Re-validate the stored definition defensively before executing.
    const definition = parseAgentDefinition({
      name: agent.name,
      intendedPurpose: agent.intendedPurpose,
      riskTier: agent.riskTier,
      graph: agent.definition,
    });

    const [run] = await withTenant(this.db, tenantId, (tx) =>
      tx
        .insert(runs)
        .values({ tenantId, agentId, agentVersion: agent.currentVersion, status: 'running', input })
        .returning(),
    );
    const runId = run!.id;

    try {
      const result = await executeAgent(definition, input, {
        providers: this.providers,
        tools: this.tools,
        tenantId,
      });
      await withTenant(this.db, tenantId, (tx) =>
        tx
          .update(runs)
          .set({
            status: 'succeeded',
            output: result.output,
            traceId: result.traceId,
            finishedAt: new Date(),
          })
          .where(eq(runs.id, runId)),
      );
      await this.audit.append(tenantId, {
        actor,
        action: 'agent.run',
        resourceType: 'run',
        resourceId: runId,
        details: { agentId, status: 'succeeded', traceId: result.traceId },
      });
      return {
        runId,
        status: 'succeeded',
        traceId: result.traceId,
        output: result.output,
        steps: result.steps,
        usage: result.usage,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.warn({ runId, agentId, err: message }, 'agent run failed');
      await withTenant(this.db, tenantId, (tx) =>
        tx
          .update(runs)
          .set({ status: 'failed', error: message, finishedAt: new Date() })
          .where(eq(runs.id, runId)),
      );
      await this.audit.append(tenantId, {
        actor,
        action: 'agent.run',
        resourceType: 'run',
        resourceId: runId,
        details: { agentId, status: 'failed', error: message },
      });
      return { runId, status: 'failed', error: message };
    }
  }

  list(tenantId: string): Promise<RunRow[]> {
    return withTenant(this.db, tenantId, (tx) =>
      tx.select().from(runs).orderBy(desc(runs.startedAt)).limit(100),
    );
  }

  async get(tenantId: string, id: string): Promise<RunRow> {
    const [run] = await withTenant(this.db, tenantId, (tx) =>
      tx.select().from(runs).where(eq(runs.id, id)).limit(1),
    );
    if (!run) throw new NotFoundException(`run ${id} not found`);
    return run;
  }
}
