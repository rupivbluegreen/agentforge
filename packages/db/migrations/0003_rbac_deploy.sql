-- Phase 2: RBAC memberships + agent deploy/egress/risk-assessment fields.

-- ---------------------------------------------------------------------------------
-- Memberships: a user's role within a tenant (RBAC). Roles map to permissions in the
-- OPA policy bundle. Tenant-scoped + RLS like every other table.
-- ---------------------------------------------------------------------------------
CREATE TABLE memberships (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_sub   text NOT NULL,
  role       text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT memberships_role_chk CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  CONSTRAINT memberships_unique UNIQUE (tenant_id, user_sub)
);
CREATE INDEX memberships_tenant_id_idx ON memberships (tenant_id);

ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships FORCE ROW LEVEL SECURITY;
CREATE POLICY memberships_tenant_isolation ON memberships
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- ---------------------------------------------------------------------------------
-- Agent lifecycle + zero-trust fields.
--   status            draft -> deployed (deploy is PEP- and AI-risk-gated)
--   egress_allowlist  hosts tools in this agent may reach (egress allow-listing)
--   risk_assessment   the AI-risk wizard's answers + classification rationale
-- ---------------------------------------------------------------------------------
ALTER TABLE agents ADD COLUMN status text NOT NULL DEFAULT 'draft';
ALTER TABLE agents ADD CONSTRAINT agents_status_chk CHECK (status IN ('draft', 'deployed'));
ALTER TABLE agents ADD COLUMN egress_allowlist jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE agents ADD COLUMN risk_assessment jsonb;
