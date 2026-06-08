# deploy/

Deployment assets.

| Directory  | Contents                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------- |
| `docker/`  | Dockerfiles + `docker compose` for the local stack (app, Postgres, Redis, Keycloak, Vault, OpenTelemetry collector, Grafana/Tempo/Prometheus/Loki). |
| `helm/`    | Production Helm charts for Kubernetes.                                                     |

The local stack is **secure-by-default** and **one-command**: `docker compose up` from
`deploy/docker` brings up a healthy environment. It is wired in during Phase 0.
