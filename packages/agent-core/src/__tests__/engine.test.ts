import { describe, expect, it } from 'vitest';
import { createProviderRegistry } from '@agentforge/providers';
import { createToolRegistry } from '@agentforge/tools';
import { executeAgent } from '../engine.js';
import { parseAgentDefinition, AgentValidationError } from '../validate.js';
import type { AgentDefinition } from '../model.js';

const deps = {
  providers: createProviderRegistry(),
  tools: createToolRegistry(),
  tenantId: '11111111-1111-1111-1111-111111111111',
  now: () => '2026-01-01T00:00:00.000Z',
};

describe('executeAgent', () => {
  it('runs a 3-node linear graph (LLM -> tool -> LLM)', async () => {
    const def: AgentDefinition = parseAgentDefinition({
      name: 'demo',
      intendedPurpose: 'test the walking skeleton',
      riskTier: 'minimal',
      graph: {
        entry: 'n1',
        nodes: [
          {
            id: 'n1',
            type: 'llm',
            provider: 'mock',
            model: 'demo',
            prompt: '{{input}}',
            outputKey: 'a',
            next: 'n2',
          },
          {
            id: 'n2',
            type: 'tool',
            tool: 'uppercase',
            input: { text: '{{a}}' },
            outputKey: 'b',
            next: 'n3',
          },
          {
            id: 'n3',
            type: 'llm',
            provider: 'mock',
            model: 'demo',
            prompt: 'Echo: {{b.text}}',
            outputKey: 'c',
          },
        ],
      },
    });

    const result = await executeAgent(def, 'hello world', deps);

    expect(result.steps.map((s) => s.type)).toEqual(['llm', 'tool', 'llm']);
    expect(result.variables.a).toBe('[mock:demo] hello world');
    expect(result.variables.b).toEqual({ text: '[MOCK:DEMO] HELLO WORLD' });
    expect(result.output).toBe('[mock:demo] Echo: [MOCK:DEMO] HELLO WORLD');
    expect(result.usage.inputTokens).toBeGreaterThan(0);
    expect(typeof result.traceId).toBe('string');
    // conversation memory accumulated across the two LLM nodes
    expect(result.messages).toHaveLength(4);
  });

  it('follows a branching (conditional) graph', async () => {
    const def = parseAgentDefinition({
      name: 'branchy',
      intendedPurpose: 'branch test',
      riskTier: 'minimal',
      graph: {
        entry: 'count',
        nodes: [
          {
            id: 'count',
            type: 'tool',
            tool: 'word_count',
            input: { text: '{{input}}' },
            outputKey: 'wc',
            next: 'cond',
          },
          {
            id: 'cond',
            type: 'conditional',
            condition: { left: '{{wc.words}}', op: 'gt', right: '2' },
            ifTrue: 'big',
            ifFalse: 'small',
          },
          { id: 'big', type: 'llm', provider: 'mock', model: 'demo', prompt: 'BIG' },
          { id: 'small', type: 'llm', provider: 'mock', model: 'demo', prompt: 'SMALL' },
        ],
      },
    });

    const many = await executeAgent(def, 'a b c d', deps);
    expect(many.steps.map((s) => s.nodeId)).toEqual(['count', 'cond', 'big']);
    expect(many.output).toContain('BIG');

    const few = await executeAgent(def, 'a b', deps);
    expect(few.steps.map((s) => s.nodeId)).toEqual(['count', 'cond', 'small']);
    expect(few.output).toContain('SMALL');
  });
});

describe('parseAgentDefinition', () => {
  const base = {
    name: 'x',
    intendedPurpose: '',
    riskTier: 'minimal',
    graph: {
      entry: 'a',
      nodes: [{ id: 'a', type: 'llm', provider: 'mock', model: 'm', prompt: 'p' }],
    },
  };

  it('accepts a valid definition', () => {
    expect(parseAgentDefinition(base).name).toBe('x');
  });

  it('rejects an invalid risk tier', () => {
    expect(() => parseAgentDefinition({ ...base, riskTier: 'bogus' })).toThrow(
      AgentValidationError,
    );
  });

  it('rejects an entry that is not a node', () => {
    expect(() =>
      parseAgentDefinition({ ...base, graph: { ...base.graph, entry: 'missing' } }),
    ).toThrow(AgentValidationError);
  });

  it('rejects a next reference to an unknown node', () => {
    const bad = {
      ...base,
      graph: {
        entry: 'a',
        nodes: [{ id: 'a', type: 'llm', provider: 'mock', model: 'm', prompt: 'p', next: 'ghost' }],
      },
    };
    expect(() => parseAgentDefinition(bad)).toThrow(AgentValidationError);
  });
});
