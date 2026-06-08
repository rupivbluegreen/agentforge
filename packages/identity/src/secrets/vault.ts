import { requireSecret, type SecretsProvider } from './provider.js';

export interface VaultConfig {
  /** Vault base address, e.g. http://vault:8200 */
  address: string;
  /** Vault token (itself sourced from a secret/orchestrator, never hardcoded). */
  token: string;
  /** KV v2 mount point. Defaults to "secret". */
  mount?: string;
  /** Path within the mount holding the app's secrets, e.g. "agentforge". */
  path: string;
  /** How long to cache a read before re-fetching. Defaults to 30s. */
  cacheTtlMs?: number;
}

/**
 * Reads secrets from HashiCorp Vault (KV v2). One path holds a map of named secrets;
 * reads are briefly cached to avoid hammering Vault. Supports short-lived credentials:
 * the cache TTL bounds how stale a rotated value can be.
 */
export class VaultSecretsProvider implements SecretsProvider {
  readonly kind = 'vault';
  private cache: { data: Record<string, string>; expires: number } | undefined;

  constructor(private readonly cfg: VaultConfig) {}

  private async load(): Promise<Record<string, string>> {
    const now = Date.now();
    if (this.cache && this.cache.expires > now) {
      return this.cache.data;
    }
    const mount = this.cfg.mount ?? 'secret';
    const base = this.cfg.address.replace(/\/+$/, '');
    const url = `${base}/v1/${mount}/data/${this.cfg.path}`;
    const res = await fetch(url, { headers: { 'X-Vault-Token': this.cfg.token } });
    if (!res.ok) {
      // Deliberately do not include the token or response body (may echo secrets).
      throw new Error(`Vault read failed (HTTP ${res.status}) for ${mount}/${this.cfg.path}`);
    }
    const body = (await res.json()) as { data?: { data?: Record<string, string> } };
    const data = body.data?.data ?? {};
    this.cache = { data, expires: now + (this.cfg.cacheTtlMs ?? 30_000) };
    return data;
  }

  async get(name: string): Promise<string | undefined> {
    return (await this.load())[name];
  }

  async getRequired(name: string): Promise<string> {
    return requireSecret(this, name);
  }
}
