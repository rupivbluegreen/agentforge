/**
 * EU AI Act risk tiers. Every agent records one (Art 6 + Annex III). The classification
 * wizard and the prohibited-use deploy block arrive in Phase 2; here we just carry the
 * field so it is part of the model from day one.
 */
export const RISK_TIERS = ['prohibited', 'high', 'limited', 'minimal'] as const;
export type RiskTier = (typeof RISK_TIERS)[number];

/** Calls an LLM with a templated prompt; appends to conversation memory. */
export interface LlmNode {
  id: string;
  type: 'llm';
  provider: string;
  model: string;
  system?: string;
  /** Prompt template; `{{var}}` placeholders are filled from run variables. */
  prompt: string;
  /** Variable to store the response text under (default `output`). */
  outputKey?: string;
  /** Next node id (linear flow). */
  next?: string;
}

/** Invokes a tool with a templated input map. */
export interface ToolNode {
  id: string;
  type: 'tool';
  tool: string;
  input?: Record<string, string>;
  outputKey?: string;
  next?: string;
}

export interface Condition {
  /** Left operand template (e.g. `{{output}}`). */
  left: string;
  op: 'eq' | 'neq' | 'contains' | 'gt' | 'lt';
  /** Right operand template or literal. */
  right: string;
}

/** Branches to one of two nodes based on a condition (enables branching graphs). */
export interface ConditionalNode {
  id: string;
  type: 'conditional';
  condition: Condition;
  ifTrue?: string;
  ifFalse?: string;
}

export type AgentNode = LlmNode | ToolNode | ConditionalNode;

export interface AgentGraph {
  /** Entry node id. */
  entry: string;
  nodes: AgentNode[];
}

export interface AgentDefinition {
  name: string;
  /** EU AI Act Art 11 / Annex IV intended purpose. */
  intendedPurpose: string;
  riskTier: RiskTier;
  graph: AgentGraph;
}
