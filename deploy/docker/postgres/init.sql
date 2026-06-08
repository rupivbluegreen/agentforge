-- Postgres bootstrap for the local agentforge stack.
--
-- Creates the dedicated application role. This role is intentionally a plain,
-- NON-SUPERUSER, NON-BYPASSRLS login so that Row-Level Security actually applies to
-- the API's queries (superusers and BYPASSRLS roles bypass RLS). Migrations run as the
-- bootstrap superuser (which owns the tables); the app connects as this role.
--
-- NOTE: the password here is a documented DEV-ONLY default. Production deployments
-- supply credentials via the secrets adapter (Vault), never a checked-in file.

CREATE ROLE agentforge_app WITH LOGIN PASSWORD 'agentforge_app_pw';

GRANT CONNECT ON DATABASE agentforge TO agentforge_app;
GRANT USAGE ON SCHEMA public TO agentforge_app;

-- Tables are created later by migrations (owned by the bootstrap superuser). Grant the
-- app role DML on anything the superuser creates in public, going forward.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agentforge_app;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO agentforge_app;
