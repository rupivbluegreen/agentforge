import { SpanStatusCode } from '@opentelemetry/api';
import { getTracer, recordUsage } from '@agentforge/telemetry';
import type { LlmMessage, ProviderRegistry } from '@agentforge/providers';
import type { ToolRegistry } from '@agentforge/tools';
import { renderTemplate } from './template.js';
import type { AgentDefinition, AgentNode, Condition } from './model.js';

export interface RunStep {
  nodeId: string;
  type: AgentNode['type'];
  startedAt: string;
  finishedAt: string;
  detail: Record<string, unknown>;
}

export interface RunResult {
  output: unknown;
  variables: Record<string, unknown>;
  messages: LlmMessage[];
  steps: RunStep[];
  usage: { inputTokens: number; outputTokens: number };
  traceId: string;
}

export interface ExecuteOptions {
  providers: ProviderRegistry;
  tools: ToolRegistry;
  tenantId: string;
  /** Cap on executed nodes; guards against cyclic graphs. */
  maxSteps?: number;
  /** Clock injection for deterministic tests. */
  now?: () => string;
}

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

function evaluateCondition(condition: Condition, vars: Record<string, unknown>): boolean {
  const left = renderTemplate(condition.left, vars);
  const right = renderTemplate(condition.right, vars);
  switch (condition.op) {
    case 'eq':
      return left === right;
    case 'neq':
      return left !== right;
    case 'contains':
      return left.includes(right);
    case 'gt':
      return Number(left) > Number(right);
    case 'lt':
      return Number(left) < Number(right);
  }
}

/**
 * Execute an agent graph end to end. Maintains short-term conversation memory across
 * LLM nodes, supports linear and branching (conditional) flows, records token/cost
 * usage per tenant, and emits an OpenTelemetry trace (one span per node under a run
 * span). Returns structured steps so the caller can persist a run + audit entries.
 */
export async function executeAgent(
  definition: AgentDefinition,
  input: unknown,
  options: ExecuteOptions,
): Promise<RunResult> {
  const { providers, tools, tenantId } = options;
  const maxSteps = options.maxSteps ?? 50;
  const now = options.now ?? (() => new Date().toISOString());
  const tracer = getTracer('agentforge.engine');

  const nodesById = new Map(definition.graph.nodes.map((n) => [n.id, n]));
  const vars: Record<string, unknown> = { input };
  const messages: LlmMessage[] = [];
  const steps: RunStep[] = [];
  const usage = { inputTokens: 0, outputTokens: 0 };
  let lastOutput: unknown = undefined;

  const runNode = async (node: AgentNode): Promise<string | undefined> => {
    const startedAt = now();
    if (node.type === 'llm') {
      const provider = providers.get(node.provider);
      messages.push({ role: 'user', content: renderTemplate(node.prompt, vars) });
      const response = await provider.generate({
        model: node.model,
        messages,
        ...(node.system ? { system: node.system } : {}),
      });
      messages.push({ role: 'assistant', content: response.text });
      const key = node.outputKey ?? 'output';
      vars[key] = response.text;
      lastOutput = response.text;
      usage.inputTokens += response.usage.inputTokens;
      usage.outputTokens += response.usage.outputTokens;
      recordUsage({
        tenantId,
        provider: response.provider,
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
      });
      steps.push({
        nodeId: node.id,
        type: node.type,
        startedAt,
        finishedAt: now(),
        detail: {
          provider: response.provider,
          model: response.model,
          outputKey: key,
          usage: response.usage,
        },
      });
      return node.next;
    }

    if (node.type === 'tool') {
      const tool = tools.get(node.tool);
      const toolInput: Record<string, unknown> = {};
      for (const [k, tpl] of Object.entries(node.input ?? {})) {
        toolInput[k] = renderTemplate(tpl, vars);
      }
      const result = await tool.execute(toolInput, { tenantId });
      const key = node.outputKey ?? 'output';
      vars[key] = result;
      lastOutput = result;
      steps.push({
        nodeId: node.id,
        type: node.type,
        startedAt,
        finishedAt: now(),
        detail: { tool: node.tool, input: toolInput, output: result, outputKey: key },
      });
      return node.next;
    }

    const branch = evaluateCondition(node.condition, vars);
    steps.push({
      nodeId: node.id,
      type: node.type,
      startedAt,
      finishedAt: now(),
      detail: { condition: node.condition, result: branch },
    });
    return branch ? node.ifTrue : node.ifFalse;
  };

  return tracer.startActiveSpan('agent.run', async (runSpan) => {
    const traceId = runSpan.spanContext().traceId;
    runSpan.setAttribute('agentforge.tenant_id', tenantId);
    runSpan.setAttribute('agentforge.agent.risk_tier', definition.riskTier);
    try {
      let currentId: string | undefined = definition.graph.entry;
      let executed = 0;
      while (currentId) {
        if (executed >= maxSteps) {
          throw new EngineError(`agent exceeded maxSteps (${maxSteps}); possible cycle`);
        }
        const node = nodesById.get(currentId);
        if (!node) throw new EngineError(`graph references unknown node "${currentId}"`);
        executed += 1;
        currentId = await tracer.startActiveSpan(`node.${node.type}`, async (span) => {
          span.setAttribute('agentforge.node.id', node.id);
          try {
            return await runNode(node);
          } finally {
            span.end();
          }
        });
      }
      runSpan.setStatus({ code: SpanStatusCode.OK });
      return { output: lastOutput, variables: vars, messages, steps, usage, traceId };
    } catch (err) {
      runSpan.recordException(err as Error);
      runSpan.setStatus({ code: SpanStatusCode.ERROR });
      throw err;
    } finally {
      runSpan.end();
    }
  });
}
