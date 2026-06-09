export type LlmRole = 'user' | 'assistant';

export interface LlmMessage {
  role: LlmRole;
  content: string;
}

export interface LlmRequest {
  model: string;
  messages: LlmMessage[];
  system?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface LlmResponse {
  text: string;
  model: string;
  provider: string;
  usage: LlmUsage;
}

/**
 * The provider-agnostic LLM interface. Every adapter (Anthropic, OpenAI, local, …)
 * implements this, so swapping providers is configuration — central to data-residency
 * routing and the DORA exit-strategy / no-lock-in requirement.
 */
export interface LlmProvider {
  readonly id: string;
  generate(request: LlmRequest): Promise<LlmResponse>;
}
