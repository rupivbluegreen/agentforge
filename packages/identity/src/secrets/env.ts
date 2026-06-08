import { requireSecret, type SecretsProvider } from './provider.js';

/**
 * Reads secrets from environment variables. Logical names are normalized to
 * UPPER_SNAKE_CASE (optionally prefixed), e.g. `db.password` -> `DB_PASSWORD`.
 *
 * This is the secure-by-default backend for local/dev and for deployments that inject
 * secrets via their orchestrator. Values are never logged.
 */
export class EnvSecretsProvider implements SecretsProvider {
  readonly kind = 'env';

  constructor(
    private readonly env: NodeJS.ProcessEnv = process.env,
    private readonly prefix = '',
  ) {}

  private toEnvKey(name: string): string {
    return this.prefix + name.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  }

  async get(name: string): Promise<string | undefined> {
    return this.env[this.toEnvKey(name)];
  }

  async getRequired(name: string): Promise<string> {
    return requireSecret(this, name);
  }
}
