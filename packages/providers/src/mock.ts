import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

/** Rough token estimate (~4 chars/token) — good enough for offline metering. */
function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

/**
 * Deterministic, offline provider. Used for tests and for running the platform without
 * external API keys. It echoes a transformed version of the last user message so agent
 * graphs produce predictable, inspectable output.
 */
export class MockProvider implements LlmProvider {
  readonly id = 'mock';

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user');
    const prompt = lastUser?.content ?? '';
    const text = `[mock:${request.model}] ${prompt.trim()}`.slice(0, 2000);
    const inputTokens =
      estimateTokens(request.system ?? '') +
      request.messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return {
      text,
      model: request.model,
      provider: this.id,
      usage: { inputTokens, outputTokens: estimateTokens(text) },
    };
  }
}
