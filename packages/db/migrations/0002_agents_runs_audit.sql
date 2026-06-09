-- Phase 1: agent definitions (versioned), runs, and the immutable audit log.
-- Every table here is tenant-scoped and protected by the same RLS pattern as 0001.

-- ---------------------------------------------------------------------------------
-- Agents: the current definition of each agent, including EU AI Act metadata.
-- ---------------------------------------------------------------------------------
CREATE TABLE agents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             text NOT NULL,
  -- AI Act metadata (Art 11/Annex IV intended purpose; Art 6/Annex III risk tier).
  intended_purpose text NOT NULL DEFAULT '',
  risk_tier        text NOT NULL DEFAULT 'minimal',
  current_version  integer NOT NULL DEFAULT 1,
  definition       jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agents_risk_tier_chk
    CHECK (risk_tier IN ('prohibited', 'high', 'limited', 'minimal'))
);
CREATE INDEX agents_tenant_id_idx ON agents (tenant_id);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
CREATE POLICY agents_tenant_isolation ON agents
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- ---------------------------------------------------------------------------------
-- Agent versions: immutable snapshots of each definition version (versioning).
-- ---------------------------------------------------------------------------------
CREATE TABLE agent_versions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id         uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  version          integer NOT NULL,
  name             text NOT NULL,
  intended_purpose text NOT NULL,
  risk_tier        text NOT NULL,
  definition       jsonb NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agent_versions_unique UNIQUE (agent_id, version)
);
CREATE INDEX agent_versions_tenant_id_idx ON agent_versions (tenant_id);

ALTER TABLE agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY agent_versions_tenant_isolation ON agent_versions
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- ---------------------------------------------------------------------------------
-- Runs: one row per agent execution (links to the OTel trace).
-- ---------------------------------------------------------------------------------
CREATE TABLE runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  agent_id      uuid NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  agent_version integer NOT NULL,
  status        text NOT NULL DEFAULT 'running',
  input         jsonb,
  output        jsonb,
  trace_id      text,
  error         text,
  started_at    timestamptz NOT NULL DEFAULT now(),
  finished_at   timestamptz,
  CONSTRAINT runs_status_chk CHECK (status IN ('running', 'succeeded', 'failed'))
);
CREATE INDEX runs_tenant_id_idx ON runs (tenant_id);
CREATE INDEX runs_agent_id_idx ON runs (agent_id);

ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs FORCE ROW LEVEL SECURITY;
CREATE POLICY runs_tenant_isolation ON runs
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);

-- ---------------------------------------------------------------------------------
-- Audit log: append-only, per-tenant hash chain (tamper-evident).
--
-- Each row's hash covers the previous row's hash plus this row's canonical content,
-- so any modification or deletion breaks the chain (verified by the governance code,
-- and by the verifier CLI added in Phase 2). `seq` is a per-tenant monotonic counter.
-- ---------------------------------------------------------------------------------
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seq           bigint NOT NULL,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  actor         text NOT NULL,
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  prev_hash     text NOT NULL,
  hash          text NOT NULL,
  CONSTRAINT audit_log_seq_unique UNIQUE (tenant_id, seq)
);
CREATE INDEX audit_log_tenant_seq_idx ON audit_log (tenant_id, seq);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
-- No UPDATE/DELETE policy is created, so even the app role can only INSERT and SELECT
-- audit rows — the log is append-only at the database level.
CREATE POLICY audit_log_select ON audit_log
  FOR SELECT
  USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT
  WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);
