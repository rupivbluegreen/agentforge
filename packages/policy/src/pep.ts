import type { PolicyDecision } from './types.js';

export class AuthorizationError extends Error {
  constructor(
    public readonly action: string,
    public readonly reason: string,
  ) {
    super(`access denied for "${action}": ${reason}`);
    this.name = 'AuthorizationError';
  }
}

/** Policy Enforcement Point: throw unless the decision allows. */
export function enforce(decision: PolicyDecision, action: string): void {
  if (!decision.allow) {
    throw new AuthorizationError(action, decision.reason);
  }
}
