-- agentforge initial schema.
--
-- Establishes the tenant registry and the first tenant-scoped table (workspaces),
-- and enforces tenant isolation at the DATABASE with Row-Level Security so that even
-- raw SQL cannot cross tenants. This is the load-bearing multi-tenant invariant.

-- ---------------------------------------------------------------------------------
-- Tenant registry (root of multi-tenancy; intentionally not RLS-scoped itself).
-- ---------------------------------------------------------------------------------
CREATE TABLE tenants (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------------
-- Workspaces: first tenant-scoped table.
-- ---------------------------------------------------------------------------------
CREATE TABLE workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX workspaces_tenant_id_idx ON workspaces (tenant_id);

-- ---------------------------------------------------------------------------------
-- Row-Level Security.
--
-- A session may only see/insert/update/delete rows whose tenant_id equals the
-- `app.current_tenant` GUC (set per-transaction by withTenant()). With missing_ok =
-- true, an unset GUC yields NULL and matches no rows, so isolation fails closed.
--
-- FORCE makes the policy apply even to the table owner, so there is no "trusted"
-- connection that can silently cross tenants. (Note: Postgres superusers and roles
-- with BYPASSRLS still bypass RLS — the application MUST connect as a non-superuser,
-- non-BYPASSRLS role. See client.ts.)
-- ---------------------------------------------------------------------------------
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces FORCE ROW LEVEL SECURITY;

-- nullif(..., '') maps both an unset GUC (NULL) and an emptied GUC ('') to NULL, so
-- the comparison yields no rows instead of raising "invalid input syntax for uuid".
CREATE POLICY workspaces_tenant_isolation ON workspaces
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
