# Local docker stack

One command brings up the whole platform, secure-by-default:

```bash
docker compose -f deploy/docker/docker-compose.yml up --build
```

## What comes up

| Service          | Role                                        | Host port |
| ---------------- | ------------------------------------------- | --------- |
| `api`            | NestJS control-plane API                    | 3000      |
| `postgres`       | Database (RLS-enforced multi-tenancy)       | internal  |
| `redis`          | Cache / queue (BullMQ later)                | internal  |
| `keycloak`       | OIDC IdP (realm `agentforge` pre-imported)  | internal  |
| `vault`          | Secrets (dev mode; seeded by `vault-seed`)  | internal  |
| `otel-collector` | Receives OTLP, fans out to Tempo/Prometheus | internal  |
| `tempo`          | Traces                                      | internal  |
| `prometheus`     | Metrics                                     | 19090     |
| `loki`           | Logs (fed by `promtail`)                    | internal  |
| `grafana`        | Dashboards (anonymous admin in dev)         | 13000     |

One-shot jobs run automatically on `up`: **`migrate`** applies database migrations (as
the table owner) and **`vault-seed`** writes the application secrets into Vault. The API
then reads those secrets through the secrets adapter — so the compliant path (Vault) is
the default even locally.

> Internal-only ports are not published to the host to avoid collisions with anything
> already running there. Reach those services from inside the compose network.

## Try it

```bash
# Liveness / readiness
curl http://localhost:3000/healthz
curl http://localhost:3000/readyz

# Guarded routes deny unauthenticated callers (zero-trust default)
curl -i http://localhost:3000/auth/me        # 401
curl -i http://localhost:3000/workspaces      # 401

# Start an OIDC login in a browser (demo user: demo / demo, tenant "acme")
open http://localhost:3000/auth/login
```

Grafana: <http://localhost:13000> · Prometheus: <http://localhost:19090>

## Credentials

All credentials are **dev-only defaults** (see `.env.example`) and must never be used
outside local development. Production supplies secret material via Vault / your
orchestrator, never a checked-in file.
