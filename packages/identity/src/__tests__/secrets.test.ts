import { describe, expect, it } from 'vitest';
import { EnvSecretsProvider } from '../secrets/env.js';
import { createSecretsProvider } from '../secrets/factory.js';
import { MissingSecretError } from '../secrets/provider.js';

describe('EnvSecretsProvider', () => {
  it('normalizes logical names to UPPER_SNAKE_CASE', async () => {
    const p = new EnvSecretsProvider({ DB_PASSWORD: 'pw', CLIENT_SECRET: 'cs' });
    expect(await p.get('db.password')).toBe('pw');
    expect(await p.get('client-secret')).toBe('cs');
    expect(await p.get('missing')).toBeUndefined();
  });

  it('applies a prefix when configured', async () => {
    const p = new EnvSecretsProvider({ AF_SESSION_KEY: 'k' }, 'AF_');
    expect(await p.get('session.key')).toBe('k');
  });

  it('getRequired throws MissingSecretError on absent/empty', async () => {
    const p = new EnvSecretsProvider({ EMPTY: '' });
    await expect(p.getRequired('empty')).rejects.toBeInstanceOf(MissingSecretError);
    await expect(p.getRequired('nope')).rejects.toBeInstanceOf(MissingSecretError);
  });
});

describe('createSecretsProvider', () => {
  it('defaults to the env provider', () => {
    expect(createSecretsProvider({}).kind).toBe('env');
  });

  it('builds a vault provider when configured', () => {
    const p = createSecretsProvider({
      SECRETS_PROVIDER: 'vault',
      VAULT_ADDR: 'http://vault:8200',
      VAULT_TOKEN: 'root',
    });
    expect(p.kind).toBe('vault');
  });

  it('rejects vault config without address/token', () => {
    expect(() => createSecretsProvider({ SECRETS_PROVIDER: 'vault' })).toThrow(/VAULT_ADDR/);
  });

  it('rejects an unknown provider', () => {
    expect(() => createSecretsProvider({ SECRETS_PROVIDER: 'aws' })).toThrow(/Unknown/);
  });
});
