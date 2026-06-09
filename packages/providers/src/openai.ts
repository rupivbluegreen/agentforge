import OpenAI from 'openai';
import type { LlmProvider, LlmRequest, LlmResponse } from './types.js';

export interface OpenAIProviderOptions {
  apiKey: string;
  baseURL?: string;
}

/** OpenAI adapter (Chat Completions). */
export class OpenAIProvider implements LlmProvider {
  readonly id = 'openai';
  private readonly client: OpenAI;

  constructor(opts: OpenAIProviderOptions) {
    this.client = new OpenAI({
      apiKey: opts.apiKey,
      ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    });
  }

  async generate(request: LlmRequest): Promise<LlmResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (request.system) messages.push({ role: 'system', content: request.system });
    for (const m of request.messages) messages.push({ role: m.role, content: m.content });

    const completion = await this.client.chat.completions.create({
      model: request.model,
      messages,
      ...(request.maxTokens !== undefined ? { max_tokens: request.maxTokens } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    });
    const choice = completion.choices[0];
    return {
      text: choice?.message?.content ?? '',
      model: completion.model,
      provider: this.id,
      usage: {
        inputTokens: completion.usage?.prompt_tokens ?? 0,
        outputTokens: completion.usage?.completion_tokens ?? 0,
      },
    };
  }
}
