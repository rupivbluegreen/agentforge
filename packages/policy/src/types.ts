export interface PolicySubject {
  sub: string;
  tenantId: string;
  roles: string[];
}

export interface PolicyResource {
  type: string;
  id?: string;
  /** EU AI Act risk tier of the resource (used by the deploy gate). */
  riskTier?: string;
  status?: string;
}

export interface PolicyInput {
  subject: PolicySubject;
  action: string;
  resource: PolicyResource;
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
}
