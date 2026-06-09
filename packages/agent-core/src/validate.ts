import { z } from 'zod';
import { RISK_TIERS, type AgentDefinition } from './model.js';

const llmNode = z.object({
  id: z.string().min(1),
  type: z.literal('llm'),
  provider: z.string().min(1),
  model: z.string().min(1),
  system: z.string().optional(),
  prompt: z.string(),
  outputKey: z.string().min(1).optional(),
  next: z.string().min(1).optional(),
});

const toolNode = z.object({
  id: z.string().min(1),
  type: z.literal('tool'),
  tool: z.string().min(1),
  input: z.record(z.string()).optional(),
  outputKey: z.string().min(1).optional(),
  next: z.string().min(1).optional(),
});

const conditionalNode = z.object({
  id: z.string().min(1),
  type: z.literal('conditional'),
  condition: z.object({
    left: z.string(),
    op: z.enum(['eq', 'neq', 'contains', 'gt', 'lt']),
    right: z.string(),
  }),
  ifTrue: z.string().min(1).optional(),
  ifFalse: z.string().min(1).optional(),
});

const node = z.discriminatedUnion('type', [llmNode, toolNode, conditionalNode]);

const agentDefinitionSchema = z
  .object({
    name: z.string().min(1),
    intendedPurpose: z.string(),
    riskTier: z.enum(RISK_TIERS),
    graph: z.object({
      entry: z.string().min(1),
      nodes: z.array(node).min(1),
    }),
  })
  .superRefine((def, ctx) => {
    const ids = def.graph.nodes.map((n) => n.id);
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'node ids must be unique' });
    }
    if (!idSet.has(def.graph.entry)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `entry "${def.graph.entry}" is not a node`,
      });
    }
    const refs = (target: string | undefined, where: string): void => {
      if (target !== undefined && !idSet.has(target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${where} references unknown node "${target}"`,
        });
      }
    };
    for (const n of def.graph.nodes) {
      if (n.type === 'conditional') {
        refs(n.ifTrue, `node ${n.id}.ifTrue`);
        refs(n.ifFalse, `node ${n.id}.ifFalse`);
      } else {
        refs(n.next, `node ${n.id}.next`);
      }
    }
  });

export class AgentValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: z.ZodIssue[],
  ) {
    super(message);
    this.name = 'AgentValidationError';
  }
}

/** Validate and normalize an untrusted agent definition. Throws on invalid input. */
export function parseAgentDefinition(input: unknown): AgentDefinition {
  const result = agentDefinitionSchema.safeParse(input);
  if (!result.success) {
    throw new AgentValidationError(
      `invalid agent definition: ${result.error.issues.map((i) => i.message).join('; ')}`,
      result.error.issues,
    );
  }
  return result.data as AgentDefinition;
}
