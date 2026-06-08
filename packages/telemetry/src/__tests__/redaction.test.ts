import { describe, expect, it } from 'vitest';
import { pino } from 'pino';
import { PINO_REDACT_PATHS, REDACTED } from '../redaction.js';

/** Capture one log line by writing to an in-memory destination. */
function logOnce(obj: Record<string, unknown>): Record<string, unknown> {
  let captured = '';
  const stream = { write: (s: string) => (captured += s) };
  const log = pino(
    { redact: { paths: PINO_REDACT_PATHS, censor: REDACTED } },
    stream as NodeJS.WritableStream,
  );
  log.info(obj, 'msg');
  return JSON.parse(captured) as Record<string, unknown>;
}

describe('log redaction', () => {
  it('redacts top-level secret keys', () => {
    const out = logOnce({ password: 'hunter2', token: 'abc', client_secret: 'sssh', keep: 'ok' });
    expect(out.password).toBe(REDACTED);
    expect(out.token).toBe(REDACTED);
    expect(out.client_secret).toBe(REDACTED);
    expect(out.keep).toBe('ok');
  });

  it('redacts nested secrets and auth headers', () => {
    const out = logOnce({
      user: { name: 'alice', apiKey: 'live_123' },
      req: { headers: { authorization: 'Bearer xyz', 'user-agent': 'test' } },
    });
    const user = out.user as Record<string, unknown>;
    const req = out.req as { headers: Record<string, unknown> };
    expect(user.apiKey).toBe(REDACTED);
    expect(user.name).toBe('alice');
    expect(req.headers.authorization).toBe(REDACTED);
    expect(req.headers['user-agent']).toBe('test');
  });

  it('does not redact innocuous fields', () => {
    const out = logOnce({ tenantId: 't-1', status: 'ok' });
    expect(out.tenantId).toBe('t-1');
    expect(out.status).toBe('ok');
  });
});
