import { describe, expect, it } from 'vitest';
import { sealCookie, openCookie, type SessionData } from '../session.js';

const SECRET = 'unit-test-secret-unit-test-secret';

const session: SessionData = {
  sub: 'user-1',
  tenantId: '11111111-1111-1111-1111-111111111111',
  tenantSlug: 'acme',
  email: 'a@example.com',
};

describe('signed session cookie', () => {
  it('round-trips a sealed value', () => {
    const token = sealCookie(session, SECRET);
    expect(openCookie<SessionData>(token, SECRET)).toEqual(session);
  });

  it('rejects a tampered payload', () => {
    const token = sealCookie(session, SECRET);
    const [payload, sig] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...session, tenantId: 'other' })).toString(
      'base64url',
    );
    expect(openCookie(`${forged}.${sig}`, SECRET)).toBeNull();
    // sanity: the original still verifies
    expect(openCookie(`${payload}.${sig}`, SECRET)).not.toBeNull();
  });

  it('rejects a value signed with a different secret', () => {
    const token = sealCookie(session, 'a-totally-different-secret-value!');
    expect(openCookie(token, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(openCookie(undefined, SECRET)).toBeNull();
    expect(openCookie('', SECRET)).toBeNull();
    expect(openCookie('no-signature', SECRET)).toBeNull();
  });
});
