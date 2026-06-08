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

  const [databaseUrl, sessionSecret, clientSecret] = await Promise.all([
    secrets.getRequired('database.url'),
    secrets.getRequired('session.secret'),
    secrets.getRequired('oidc.client.secret'),
  ]);

  return {
    env: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 3000),
    databaseUrl,
    sessionSecret,
    cookieSecure:
      env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE === 'true' : env.NODE_ENV === 'production',
    oidc: {
      issuerUrl: requireEnv(env, 'OIDC_ISSUER_URL'),
      clientId: requireEnv(env, 'OIDC_CLIENT_ID'),
      clientSecret,
      redirectUri: requireEnv(env, 'OIDC_REDIRECT_URI'),
    },
  };
}
