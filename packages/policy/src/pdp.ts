import type { PolicyInput, PolicyDecision } from './types.js';

export interface PdpOptions {
  /** OPA base URL, e.g. https://opa:8181 */
  url: string;
  /** Data path of the decision document. Default: agentforge/authz/decision */
  decisionPath?: string;
  /** undici Dispatcher (for mTLS client certs). Passed through to fetch. */
  dispatcher?: unknown;
  timeoutMs?: number;
}

interface OpaResponse {
  result?: { allow?: boolean; reason?: string };
}

/**
 * Policy Decision Point — evaluates a {@link PolicyInput} against the OPA policy bundle
 * over OPA's HTTP Data API. Fails CLOSED: any error (OPA down, malformed response) is a
 * deny, so a broken PDP can never silently grant access.
 */
export class PolicyDecisionPoint {
  private readonly base: string;
  private readonly decisionPath: string;

  constructor(private readonly options: PdpOptions) {
    this.base = options.url.replace(/\/+$/, '');
    this.decisionPath = options.decisionPath ?? 'agentforge/authz/decision';
  }

  async evaluate(input: PolicyInput): Promise<PolicyDecision> {
    const url = `${this.base}/v1/data/${this.decisionPath}`;
    try {
      // `dispatcher` is an undici (Node fetch) extension for mTLS; not in the standard
      // RequestInit, so we attach it on a widened type.
      const init: RequestInit = {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5000),
      };
      if (this.options.dispatcher) {
        (init as Record<string, unknown>).dispatcher = this.options.dispatcher;
      }
      const res = await fetch(url, init);
      if (!res.ok) {
        return { allow: false, reason: `policy evaluation failed (HTTP ${res.status})` };
      }
      const body = (await res.json()) as OpaResponse;
      if (!body.result || typeof body.result.allow !== 'boolean') {
        return { allow: false, reason: 'policy returned no decision (deny by default)' };
      }
      return { allow: body.result.allow, reason: body.result.reason ?? 'no reason given' };
    } catch (err) {
      return { allow: false, reason: `policy decision point unreachable: ${String(err)}` };
    }
  }
}
