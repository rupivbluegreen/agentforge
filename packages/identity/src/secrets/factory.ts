import { EnvSecretsProvider } from './env.js';
import { VaultSecretsProvider, type VaultConfig } from './vault.js';
import type { SecretsProvider } from './provider.js';

/**
 * Construct the configured secrets backend. Controlled by `SECRETS_PROVIDER`:
 *   - `env`   (default) — read from environment variables.
 *   - `vault`           — read from HashiCorp Vault (requires VAULT_ADDR + VAULT_TOKEN).
 */
export function createSecretsProvider(env: NodeJS.ProcessEnv = process.env): SecretsProvider {
  const kind = (env.SECRETS_PROVIDER ?? 'env').toLowerCase();

  switch (kind) {
    case 'env':
      return new EnvSecretsProvider(env, env.SECRETS_ENV_PREFIX ?? '');
    case 'vault': {
      const { VAULT_ADDR: address, VAULT_TOKEN: token } = env;
      if (!address || !token) {
        throw new Error('SECRETS_PROVIDER=vault requires VAULT_ADDR and VAULT_TOKEN');
      }
      const cfg: VaultConfig = { address, token, path: env.VAULT_SECRET_PATH ?? 'agentforge' };
      if (env.VAULT_KV_MOUNT) cfg.mount = env.VAULT_KV_MOUNT;
      return new VaultSecretsProvider(cfg);
    }
    default:
      throw new Error(`Unknown SECRETS_PROVIDER "${kind}" (expected "env" or "vault")`);
  }
}
