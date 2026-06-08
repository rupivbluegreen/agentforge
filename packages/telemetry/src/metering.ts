import type { Counter } from '@opentelemetry/api';
import { getMeter } from './tracing.js';

let tokenCounter: Counter | undefined;
let costCounter: Counter | undefined;

function counters(): { tokens: Counter; cost: Counter } {
  if (!tokenCounter || !costCounter) {
    const meter = getMeter('agentforge.llm');
    tokenCounter = meter.createCounter('agentforge.llm.tokens', {
      description: 'LLM tokens consumed',
      unit: '{token}',
    });
    costCounter = meter.createCounter('agentforge.llm.cost', {
      description: 'Estimated LLM cost',
      unit: 'USD',
    });
  }
  return { tokens: tokenCounter, cost: costCounter };
}

export interface UsageRecord {
  tenantId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: number;
}

/**
 * Record LLM token/cost usage as OpenTelemetry metrics, tagged by tenant/provider/model.
 * This is the seed of cost tracking and (later) DORA concentration-risk monitoring — the
 * dimensions are deliberately tenant- and provider-scoped from the start.
 */
export function recordUsage(u: UsageRecord): void {
  const { tokens, cost } = counters();
  const attrs = {
    'agentforge.tenant_id': u.tenantId,
    'llm.provider': u.provider,
    'llm.model': u.model,
  };
  tokens.add(u.inputTokens, { ...attrs, 'llm.token_type': 'input' });
  tokens.add(u.outputTokens, { ...attrs, 'llm.token_type': 'output' });
  if (u.costUsd !== undefined) {
    cost.add(u.costUsd, attrs);
  }
}
