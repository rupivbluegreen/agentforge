import { MockProvider } from './mock.js';
import { AnthropicProvider } from './anthropic.js';
import { OpenAIProvider } from './openai.js';
import type { LlmProvider } from './types.js';

export class UnknownProviderError extends Error {
  constructor(
    public readonly providerId: string,
    available: string[],
  ) {
    super(`Unknown LLM provider "${providerId}". Available: ${available.join(', ') || '(none)'}`);
    this.name = 'UnknownProviderError';
  }
}

/** Holds the configured LLM providers; selection is by id (config, not code). */
export class ProviderRegistry {
  private readonly providers = new Map<string, LlmProvider>();

  register(provider: LlmProvider): this {
    this.providers.set(provider.id, provider);
    return this;
  }

  has(id: string): boolean {
    return this.providers.has(id);
  }

  ids(): string[] {
    return [...this.providers.keys()];
  }

  get(id: string): LlmProvider {
    const provider = this.providers.get(id);
    if (!provider) throw new UnknownProviderError(id, this.ids());
    return provider;
  }
}

export interface RegistryOptions {
  anthropicApiKey?: string;
  openaiApiKey?: string;
  /** Register the offline mock provider (default true). */
  includeMock?: boolean;
}

/**
 * Build a registry from available credentials. The mock provider is always available
 * (unless disabled) so the platform runs with no external keys; real adapters are added
 * when their key is present.
 */
export function createProviderRegistry(opts: RegistryOptions = {}): ProviderRegistry {
  const registry = new ProviderRegistry();
  if (opts.includeMock ?? true) registry.register(new MockProvider());
  if (opts.anthropicApiKey)
    registry.register(new AnthropicProvider({ apiKey: opts.anthropicApiKey }));
  if (opts.openaiApiKey) registry.register(new OpenAIProvider({ apiKey: opts.openaiApiKey }));
  return registry;
}
