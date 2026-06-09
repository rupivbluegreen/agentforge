export type { PolicySubject, PolicyResource, PolicyInput, PolicyDecision } from './types.js';
export { PolicyDecisionPoint, type PdpOptions } from './pdp.js';
export { enforce, AuthorizationError } from './pep.js';

/** Role names recognized by the policy bundle (source of truth is bundle/authz.rego). */
export const ROLES = ['owner', 'admin', 'member', 'viewer'] as const;
export type Role = (typeof ROLES)[number];
