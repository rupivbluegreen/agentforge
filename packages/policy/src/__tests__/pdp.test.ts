import { afterEach, describe, expect, it, vi } from 'vitest';
import { PolicyDecisionPoint } from '../pdp.js';
import { enforce, AuthorizationError } from '../pep.js';
import type { PolicyInput } from '../types.js';

const input: PolicyInput = {
  subject: { sub: 'u1', tenantId: 't1', roles: ['member'] },
  action: 'agent.run',
  resource: { type: 'agent', id: 'a1' },
};

function stubFetch(status: number, body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe('PolicyDecisionPoint', () => {
  const pdp = new PolicyDecisionPoint({ url: 'http://opa:8181' });

  it('returns the OPA decision', async () => {
    stubFetch(200, { result: { allow: true, reason: 'granted by role' } });
    expect(await pdp.evaluate(input)).toEqual({ allow: true, reason: 'granted by role' });
  });

  it('fails closed when OPA errors', async () => {
    stubFetch(500, {});
    const d = await pdp.evaluate(input);
    expect(d.allow).toBe(false);
  });

  it('fails closed on a malformed/empty result', async () => {
    stubFetch(200, {});
    expect((await pdp.evaluate(input)).allow).toBe(false);
  });

  it('fails closed when the PDP is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNREFUSED');
      }),
    );
    expect((await pdp.evaluate(input)).allow).toBe(false);
  });
});

describe('enforce', () => {
  it('throws AuthorizationError on deny', () => {
    expect(() => enforce({ allow: false, reason: 'nope' }, 'agent.run')).toThrow(
      AuthorizationError,
    );
  });
  it('passes on allow', () => {
    expect(() => enforce({ allow: true, reason: 'ok' }, 'agent.run')).not.toThrow();
  });
});
