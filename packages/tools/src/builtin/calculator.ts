import { defineTool, ToolInputError, type ToolInput } from '../types.js';

// Only digits, whitespace, decimal points, parentheses, and the four operators are
// allowed. The strict whitelist means no identifiers can appear, so evaluating the
// arithmetic cannot reach any scope or built-in — it is a pure numeric expression.
const SAFE_EXPRESSION = /^[\d\s.+\-*/()]+$/;

function readExpression(input: ToolInput): string {
  const expr = input.expression;
  if (typeof expr !== 'string' || expr.trim() === '') {
    throw new ToolInputError('calculator requires a non-empty "expression" string');
  }
  if (!SAFE_EXPRESSION.test(expr)) {
    throw new ToolInputError('calculator expression may only contain numbers and + - * / ( )');
  }
  return expr;
}

export const calculatorTool = defineTool({
  name: 'calculator',
  description: 'Evaluate a basic arithmetic expression (e.g. "2 * (3 + 4)").',
  async execute(input) {
    const expression = readExpression(input);
    const result = Function(`"use strict"; return (${expression});`)() as unknown;
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      throw new ToolInputError(`calculator produced a non-finite result for "${expression}"`);
    }
    return { expression, result };
  },
});
