# @agentforge/identity

The zero-trust identity foundation: authN/authZ, workload identity, and **secrets
adapters**. Phase 0 implements the secrets adapter; authZ (RBAC/ABAC via OPA) and
workload identity (mTLS/SPIFFE) land in Phase 2.

## Secrets adapter

All secret material — DB passwords, OIDC client secrets, session keys, provider API
keys — is read through the `SecretsProvider` interface. It is **never hardcoded and
never logged**, and swapping backends is configuration, not code.

```ts
import { createSecretsProvider } from '@agentforge/identity';

const secrets = createSecretsProvider(); // reads SECRETS_PROVIDER
const dbUrl = await secrets.getRequired('database.url'); // throws if absent
```

### Backends

| `SECRETS_PROVIDER` | Source                          | Notes                                          |
| ------------------ | ------------------------------- | ---------------------------------------------- |
| `env` (default)    | environment variables           | `database.url` → `DATABASE_URL`; optional prefix |
| `vault`            | HashiCorp Vault (KV v2)         | needs `VAULT_ADDR` + `VAULT_TOKEN`; reads cached briefly to support short-lived secrets |

`getRequired(name)` throws `MissingSecretError` when a secret is absent or empty, so a
misconfigured deployment fails fast and loudly rather than running half-configured.
