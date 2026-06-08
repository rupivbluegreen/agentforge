/**
 * Secret redaction for structured logs. This is the mechanism behind the platform
 * rule that secrets never appear in logs or traces. It is best-effort, key-name based:
 * it redacts the listed leaf keys wherever they appear. Code must still avoid logging
 * raw secret *values* under unexpected key names — redaction is a safety net, not a
 * license to log secrets.
 */
export const REDACTED = '[REDACTED]';

/** Leaf key names whose values must never be logged (matched case-sensitively by pino). */
export const SENSITIVE_KEYS = [
  'password',
  'pass',
  'secret',
  'token',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'idToken',
  'id_token',
  'authorization',
  'cookie',
  'apiKey',
  'api_key',
  'clientSecret',
  'client_secret',
  'privateKey',
  'private_key',
  'sessionId',
  'session',
] as const;

/**
 * pino `redact.paths`. We cover top-level keys, one level of nesting (`*.key`), and the
 * common HTTP header shapes. pino requires each path to be unique, so we dedupe.
 */
export const PINO_REDACT_PATHS: string[] = Array.from(
  new Set<string>([
    ...SENSITIVE_KEYS,
    ...SENSITIVE_KEYS.map((k) => `*.${k}`),
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.headers.authorization',
    '*.headers.cookie',
  ]),
);
