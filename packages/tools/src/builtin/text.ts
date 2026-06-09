import { defineTool, ToolInputError, type ToolInput } from '../types.js';

function readText(input: ToolInput): string {
  const text = input.text;
  if (typeof text !== 'string') {
    throw new ToolInputError('this tool requires a "text" string');
  }
  return text;
}

export const uppercaseTool = defineTool({
  name: 'uppercase',
  description: 'Transform the provided "text" to upper case.',
  async execute(input) {
    const text = readText(input);
    return { text: text.toUpperCase() };
  },
});

export const wordCountTool = defineTool({
  name: 'word_count',
  description: 'Count the words and characters in the provided "text".',
  async execute(input) {
    const text = readText(input);
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    return { words, characters: text.length };
  },
});
