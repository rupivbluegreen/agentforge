import { calculatorTool } from './builtin/calculator.js';
import { uppercaseTool, wordCountTool } from './builtin/text.js';
import type { Tool } from './types.js';

export class UnknownToolError extends Error {
  constructor(
    public readonly toolName: string,
    available: string[],
  ) {
    super(`Unknown tool "${toolName}". Available: ${available.join(', ') || '(none)'}`);
    this.name = 'UnknownToolError';
  }
}

/** Holds the tools available to agents. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  register(tool: Tool): this {
    this.tools.set(tool.name, tool);
    return this;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  list(): Tool[] {
    return [...this.tools.values()];
  }

  get(name: string): Tool {
    const tool = this.tools.get(name);
    if (!tool) throw new UnknownToolError(name, this.names());
    return tool;
  }
}

export const builtinTools: Tool[] = [calculatorTool, uppercaseTool, wordCountTool];

/** A registry pre-loaded with the built-in tools. */
export function createToolRegistry(extra: Tool[] = []): ToolRegistry {
  const registry = new ToolRegistry();
  for (const tool of [...builtinTools, ...extra]) registry.register(tool);
  return registry;
}
