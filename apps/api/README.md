# @agentforge/api

NestJS control-plane API (BFF). Phase 0 stands up the secure skeleton: health checks,
**OIDC login**, stateless sessions, tenant-context resolution, manual OTel tracing, and
a tenant-scoped resource to prove isolation end to end.

## Endpoints

| Method & path        | Auth        | Purpose                                                        |
| -------------------- | ----------- | ------------------------------------------------------------- |
| `GET /healthz`       | none        | Liveness.                                                     |
| `GET /readyz`        | none        | Readiness — checks the database is reachable.                 |
| `GET /auth/login`    | none        | Start OIDC Authorization Code + PKCE flow (redirect to IdP).  |
| `GET /auth/callback` | none        | OIDC redirect target; sets the signed session cookie.         |
| `GET /auth/me`       | session     | The current authenticated principal + tenant.                |
| `POST /auth/logout`  | none        | Clear the local session.                                      |
| `GET /workspaces`    | session     | List the caller's tenant's workspaces (RLS-scoped).          |
| `POST /workspaces`   | session     | Create a workspace for the caller's tenant.                  |

## How the pieces fit

- **Config & secrets** — `loadConfig()` resolves all settings at bootstrap; secret
  material (DB URL, session key, OIDC client secret) comes via the `@agentforge/identity`
  secrets adapter. Non-secret OIDC settings come from env.
- **OIDC** — `openid-client` Authorization Code flow with **PKCE**; CSRF `state`, `nonce`,
  and the PKCE verifier are stashed in a short-lived signed cookie during the redirect.
- **Sessions** — stateless: an HMAC-signed cookie carries the minimal principal + tenant.
  Tampering is rejected (see `auth/session.ts` and its tests). Aligns with the
  stateless-services multi-tenancy invariant.
- **Tenancy** — the tenant comes from an IdP `tenant` claim (provisioned on first login);
  every data query runs through `withTenant()`, so Postgres RLS enforces isolation.
- **Zero-trust default** — unauthenticated requests to guarded routes get `401`; the
  denial is logged via the tracing interceptor.
- **Telemetry** — `TracingInterceptor` wraps every request in an OTel span and emits a
  redaction-safe access log.

## Run

Built with `tsc` (NestJS needs decorator metadata, which esbuild/tsx don't emit) and run
as `node dist/main.js`. Locally, use the docker stack in `deploy/docker`, which provides
Postgres, Keycloak (with a pre-imported realm), Vault, and the OpenTelemetry/Grafana
stack. Required env is documented in `deploy/docker/.env.example`.
