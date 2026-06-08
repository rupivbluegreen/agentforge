import { createHmac, timingSafeEqual } from 'node:crypto';

/** Minimal authenticated-session payload carried in a signed cookie (stateless). */
export interface SessionData {
  sub: string;
  email?: string;
  name?: string;
  tenantId: string;
  tenantSlug: string;
}

/** Transient data stashed during the OIDC redirect (CSRF state, nonce, PKCE verifier). */
export interface OidcFlowData {
  state: string;
  nonce: string;
  codeVerifier: string;
}

export const SESSION_COOKIE = 'af_session';
export const OIDC_FLOW_COOKIE = 'af_oidc';

function sign(payloadB64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/** Encode + HMAC-sign a value into a `payload.signature` cookie string. */
export function sealCookie(data: unknown, secret: string): string {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

/** Verify and decode a sealed cookie; returns null on any tampering/parse failure. */
export function openCookie<T>(token: string | undefined, secret: string): T | null {
  if (!token) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(payload, secret);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}
