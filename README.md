# agentforge

> Compliance-first platform for building, deploying, and governing AI agents — where
> **GDPR, DORA, NIS2, the EU AI Act, and zero-trust controls are platform primitives,
> not bolt-ons.**

agentforge lets regulated enterprises ship AI agents to production in days instead of
quarters: the platform **enforces** the controls and **generates the audit evidence**
(RoPA, DPIA/FRIA scaffolds, EU AI Act technical documentation, incident reports, the
DORA third-party register) as a byproduct of normal operation.

> **A note on language:** agentforge *supports compliance with* these regulations by
> providing enforceable controls and auditor-ready evidence. It does not, and cannot,
> *make you compliant* — conformity is your auditor's call.

## Status

🚧 **Greenfield — Phase 0 (Foundation & secure scaffolding).** See the build plan for
the phased roadmap. `main` is kept deployable: it builds, tests pass, and
`docker compose up` yields a healthy stack.

## Repository layout

```
/apps
  /web            Next.js control-plane UI (builder + code + policy + risk wizard)
  /api            NestJS control-plane API
  /runtime        agent execution engine
/packages
  /agent-core     agent definition model (incl. AI-risk metadata) + orchestration
  /providers      LLM provider adapters + routing
  /tools          built-in tools + tool SDK + sandbox protocol
  /policy         PDP/PEP, OPA bindings, policy bundles
  /governance     audit log, DSR, AI-risk classifier, incident mgmt, ICT registry, evidence gen
  /guardrails     PII detect/redact, injection detection, moderation, schema, AI labeling
  /identity       authN/authZ, workload identity, secrets adapters
  /telemetry      OTel setup, structured logging, cost/token metering
  /db             tenant-scoped Postgres schema, migrations, RLS tenancy primitives
  /sdk            client SDK for embedding agents in host apps
  /ui-kit         shared UI components
/compliance
  /controls       control definitions as code (id, owner, enforcement, evidence)
  /mappings       crosswalk: control → GDPR/DORA/NIS2/EU AI Act clauses
  /templates      RoPA, DPIA, FRIA, AI Act Annex IV tech-doc, incident report, ICT register
/deploy
  /docker         Dockerfiles + compose (app, Grafana, OPA, Vault, Keycloak)
  /helm           production charts
/docs             concepts, how-to, compliance guide, security model, ADRs
```

## Prerequisites

- **Node.js ≥ 20.11** (`.nvmrc` pins 20)
- **pnpm ≥ 10** (`corepack enable` recommended)
- **Docker** + Docker Compose (for the local stack)

## Quickstart (developer)

```bash
pnpm install
pnpm build
pnpm test
```

The one-command local stack (Postgres, Redis, Keycloak, Vault, OpenTelemetry +
Grafana/Tempo/Prometheus/Loki) lands later in Phase 0 under `deploy/docker`.

## Multi-tenancy & security posture

- **Tenant-scoped from day one.** Every persisted row carries a `tenant_id`, and
  isolation is enforced at the database with **Postgres Row-Level Security** — not just
  application `WHERE` clauses. See [`packages/db`](./packages/db).
- **Secure by default.** The easy path is the compliant path. Opting out of a control
  is explicit and logged.
- **Secrets** never live in code, logs, or traces — always via the secrets adapter.

## Contributing

Apache-2.0 with **DCO sign-off** (`git commit -s`). See
[`CONTRIBUTING.md`](./CONTRIBUTING.md). Report vulnerabilities privately per
[`SECURITY.md`](./SECURITY.md).

## License

[Apache-2.0](./LICENSE).
