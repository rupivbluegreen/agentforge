# 1. Tenant isolation via Postgres Row-Level Security

- **Status:** Accepted
- **Date:** 2026-06-08
- **Phase:** 0 (Foundation & secure scaffolding)

## Context

The build plan requires the platform to be multi-tenant from day one, with "no shared
mutable state across tenants" and "every persisted row carries a tenant id" (build
plan instruction #6, §4.3, Phase 0 acceptance). A future managed/hosted offering
depends on this isolation being airtight, and the compliance posture (GDPR Art 32,
NIS2/DORA access control, zero-trust least-privilege) treats cross-tenant data
exposure as a reportable breach.

A purely application-level approach — appending `WHERE tenant_id = $current` to every
query — is the common but fragile pattern: a single forgotten clause, a raw query, a
new developer, or an ORM escape hatch silently leaks data across tenants, and nothing
fails loudly.

## Decision

Enforce tenant isolation in **two layers**, with the database as the authoritative one:

1. **Application layer.** Every tenant-scoped table includes a `NOT NULL tenant_id`
   FK (via the shared `tenantColumns` helper). All access goes through a `withTenant()`
   wrapper that opens a transaction and sets a `LOCAL` session variable
   (`app.current_tenant`). This makes the compliant path the easy path.

2. **Database layer (authoritative).** Every tenant-scoped table has a **Row-Level
   Security** policy keyed to `app.current_tenant`, with `FORCE ROW LEVEL SECURITY`.
   Even hand-written raw SQL cannot cross tenants. The policy uses
   `nullif(current_setting('app.current_tenant', true), '')::uuid`, so an unset/empty
   context matches **no rows** — isolation **fails closed**.

The application connects as a dedicated **non-superuser, non-`BYPASSRLS`** role that
does not own the tables; migrations run as a separate, more-privileged role. (Postgres
superusers and `BYPASSRLS` roles bypass RLS, so the role posture is part of the control.)

## Consequences

**Positive**

- Isolation holds even against bugs, raw SQL, and future ORM/query additions.
- Fail-closed by default: missing tenant context yields zero rows, not a leak.
- Produces auditable evidence (policies are in migration SQL, versioned with the schema)
  for the §7 control "no shared mutable state across tenants".
- `LOCAL` GUC scoping means the setting can never leak across requests on a pooled
  connection.

**Negative / costs**

- Requires disciplined role management in every deployment (documented in
  `packages/db/README.md` and enforced via the connection-role requirement).
- A small per-query/transaction overhead and a hard requirement to wrap tenant access
  in `withTenant()` (mitigated by it being the only ergonomic path).
- RLS cannot be exercised by a superuser connection, so tests must drop to a
  non-superuser role (we use PGlite + `SET ROLE` to prove the negative path in CI).

## Alternatives considered

- **Database-per-tenant / schema-per-tenant.** Strongest isolation, but operationally
  heavy at scale and complicates cross-tenant control-plane operations and migrations.
  Revisit for BYOC/high-isolation tiers; RLS is the right default for the shared plane.
- **Application-level scoping only.** Rejected: fragile, no fail-closed guarantee, weak
  evidence story.
