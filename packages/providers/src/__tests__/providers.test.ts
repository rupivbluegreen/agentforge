import { describe, expect, it } from 'vitest';
import { MockProvider } from '../mock.js';
import { createProviderRegistry, UnknownProviderError } from '../registry.js';

describe('MockProvider', () => {
  it('is deterministic and echoes the last user message', async () => {
    const p = new MockProvider();
    const r1 = await p.generate({ model: 'demo', messages: [{ role: 'user', content: 'hello' }] });
    const r2 = await p.generate({ model: 'demo', messages: [{ role: 'user', content: 'hello' }] });
    expect(r1).toEqual(r2);
    expect(r1.text).toContain('hello');
    expect(r1.provider).toBe('mock');
    expect(r1.usage.inputTokens).toBeGreaterThan(0);
    expect(r1.usage.outputTokens).toBeGreaterThan(0);
  });
});

describe('createProviderRegistry', () => {
  it('always includes mock and adds adapters when keys are present', () => {
    expect(createProviderRegistry().ids()).toEqual(['mock']);
    const full = createProviderRegistry({ anthropicApiKey: 'x', openaiApiKey: 'y' });
    expect(full.ids().sort()).toEqual(['anthropic', 'mock', 'openai']);
  });

  it('throws a helpful error for an unknown provider', () => {
    const reg = createProviderRegistry();
    expect(() => reg.get('nope')).toThrow(UnknownProviderError);
  });
});
