/**
 * Secrets adapter interface. ALL secret material (DB passwords, OIDC client secrets,
 * session keys, provider API keys) is read through this — never hardcoded, never logged.
 * The default implementation reads from the environment; the Vault implementation reads
 * short-lived secrets from HashiCorp Vault. Swapping backends is config, not code.
 */
export interface SecretsProvider {
  /** Backend name, for diagnostics (never logs values). */
  readonly kind: string;
  /** Resolve a secret by logical name; undefined if absent. */
  get(name: string): Promise<string | undefined>;
  /** Resolve a secret, throwing {@link MissingSecretError} if absent. */
  getRequired(name: string): Promise<string>;
}

export class MissingSecretError extends Error {
  constructor(public readonly secretName: string) {
    super(`Required secret "${secretName}" is not configured`);
    this.name = 'MissingSecretError';
  }
}

/** Shared helper so every provider gets identical getRequired semantics. */
export async function requireSecret(
  provider: Pick<SecretsProvider, 'get'>,
  name: string,
): Promise<string> {
  const value = await provider.get(name);
  if (value === undefined || value === '') {
    throw new MissingSecretError(name);
  }
  return value;
}
