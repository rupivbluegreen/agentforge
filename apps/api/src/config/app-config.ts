import { createSecretsProvider } from '@agentforge/identity';

export interface OidcConfig {
  issuerUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface AppConfig {
  env: string;
  port: number;
  /** Postgres URL for the application role (non-superuser, RLS-constrained). */
  databaseUrl: string;
  /** HMAC key for signing session cookies. */
  sessionSecret: string;
  /** Secure cookie flag — true in production / behind TLS. */
  cookieSecure: boolean;
  oidc: OidcConfig;
  /** Where to send the browser after a successful login (the web app's home). */
  postLoginRedirect: string;
  /** Optional LLM provider API keys (the offline mock provider is always available). */
  providerKeys: { anthropic?: string; openai?: string };
}

function requireEnv(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];
  if (!value) throw new Error(`Missing required configuration: ${key}`);
  return value;
}

/**
 * Resolve all configuration at bootstrap. Secret material (DB URL, session key, OIDC
 * client secret) comes through the secrets adapter; non-secret settings come from env.
 */
export async function loadConfig(env: NodeJS.ProcessEnv = process.env): Promise<AppConfig> {
  const secrets = createSecretsProvider(env);

  const [databaseUrl, sessionSecret, clientSecret, anthropicKey, openaiKey] = await Promise.all([
    secrets.getRequired('database.url'),
    secrets.getRequired('session.secret'),
    secrets.getRequired('oidc.client.secret'),
    secrets.get('anthropic.api.key'),
    secrets.get('openai.api.key'),
  ]);

  return {
    env: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 3000),
    databaseUrl,
    sessionSecret,
    cookieSecure:
      env.COOKIE_SECURE !== undefined
        ? env.COOKIE_SECURE === 'true'
        : env.NODE_ENV === 'production',
    oidc: {
      issuerUrl: requireEnv(env, 'OIDC_ISSUER_URL'),
      clientId: requireEnv(env, 'OIDC_CLIENT_ID'),
      clientSecret,
      redirectUri: requireEnv(env, 'OIDC_REDIRECT_URI'),
    },
    postLoginRedirect: env.OIDC_POST_LOGIN_REDIRECT ?? '/',
    providerKeys: {
      ...(anthropicKey ? { anthropic: anthropicKey } : {}),
      ...(openaiKey ? { openai: openaiKey } : {}),
    },
  };
}
