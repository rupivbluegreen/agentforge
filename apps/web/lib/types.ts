export interface Me {
  sub: string;
  email?: string;
  name?: string;
  tenantId: string;
  tenantSlug: string;
}

export interface Agent {
  id: string;
  name: string;
  intendedPurpose: string;
  riskTier: string;
  currentVersion: number;
  createdAt: string;
}

export interface RunStep {
  nodeId: string;
  type: string;
  detail: Record<string, unknown>;
}

export interface RunOutcome {
  runId: string;
  status: 'succeeded' | 'failed';
  traceId?: string;
  output?: unknown;
  steps?: RunStep[];
  usage?: { inputTokens: number; outputTokens: number };
  error?: string;
}

export interface AuditRow {
  seq: number | string;
  occurredAt: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  hash: string;
}

export interface ChainVerification {
  valid: boolean;
  entries: number;
  brokenAtSeq?: number;
  reason?: string;
}

export interface Meta {
  providers: string[];
  tools: string[];
  riskTiers: string[];
}
