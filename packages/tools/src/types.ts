/**
 * Context handed to every tool invocation. It is tenant-scoped from the start; later
 * phases extend it with the egress allow-list, per-tool authorization, and secrets.
 */
export interface ToolContext {
  tenantId: string;
}

export type ToolInput = Record<string, unknown>;

/**
 * A tool the agent can call. Built-in tools run in-process; the Python/out-of-process
 * sandbox protocol (with egress control) arrives in later phases, but the interface is
 * intentionally async + serializable-in/out so a built-in can be swapped for a
 * sandboxed implementation without changing callers.
 */
export interface Tool {
  readonly name: string;
  readonly description: string;
  execute(input: ToolInput, ctx: ToolContext): Promise<unknown>;
}

export class ToolInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ToolInputError';
  }
}

/** Identity helper for authoring tools with inferred types. */
export function defineTool(tool: Tool): Tool {
  return tool;
}
