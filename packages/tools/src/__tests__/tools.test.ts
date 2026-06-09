import { describe, expect, it } from 'vitest';
import { createToolRegistry, UnknownToolError } from '../registry.js';
import { calculatorTool } from '../builtin/calculator.js';
import { ToolInputError } from '../types.js';

const ctx = { tenantId: '11111111-1111-1111-1111-111111111111' };

describe('calculator tool', () => {
  it('evaluates arithmetic', async () => {
    expect(await calculatorTool.execute({ expression: '2 * (3 + 4)' }, ctx)).toEqual({
      expression: '2 * (3 + 4)',
      result: 14,
    });
  });

  it('rejects non-arithmetic input (no code execution)', async () => {
    await expect(
      calculatorTool.execute({ expression: 'process.exit(1)' }, ctx),
    ).rejects.toBeInstanceOf(ToolInputError);
    await expect(calculatorTool.execute({ expression: '' }, ctx)).rejects.toBeInstanceOf(
      ToolInputError,
    );
  });
});

describe('tool registry', () => {
  it('pre-loads built-in tools', () => {
    const reg = createToolRegistry();
    expect(reg.names().sort()).toEqual(['calculator', 'uppercase', 'word_count']);
  });

  it('throws for unknown tools', () => {
    expect(() => createToolRegistry().get('nope')).toThrow(UnknownToolError);
  });

  it('uppercase transforms text', async () => {
    const out = (await createToolRegistry().get('uppercase').execute({ text: 'hi' }, ctx)) as {
      text: string;
    };
    expect(out.text).toBe('HI');
  });
});
