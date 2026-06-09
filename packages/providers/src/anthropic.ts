import Anthropic from '@anthropic-ai/sdk';
import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

export interface AnthropicProviderOptions {
  apiKey: string;
  baseURL?: string;
}

/** Anthropic (Claude) adapter. */
export class AnthropicProvider implements LlmProvider {
  readonly id = 'anthropic';
  private readonly client: Anthropic;

  constructor(opts: AnthropicProviderOptions) {
    this.client = new Anthropic({
      apiKey: opts.apiKey,
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const message = await this.client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens ?? 1024,
      ...(request.system ? { system: request.system } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
      messages: request.messages.map((m) => ({ role: m.role, content: m.content })),
    });
    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');
    return {
      text,
      model: message.model,
      provider: this.id,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    };
  }
}
