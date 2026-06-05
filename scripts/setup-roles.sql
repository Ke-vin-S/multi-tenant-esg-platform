-- Run as the postgres superuser inside the container, e.g.
--   docker exec -i <container> psql -U postgres -d esg_dev < scripts/setup-roles.sql
--
-- Idempotent — safe to re-run after migrations.

-- 1. Privileged role for the globalPrisma client (CORPORATE_ANALYST / GLOBAL_ADMIN).
--    Has app.bypass_rls = 'on' set at the role level so it sees all tenants.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'esg_privileged') THEN
    CREATE ROLE esg_privileged LOGIN PASSWORD 'password_privileged';
  END IF;
END $$;
ALTER ROLE esg_privileged SET "app.bypass_rls" = 'on';
GRANT ALL PRIVILEGES ON DATABASE esg_dev TO esg_privileged;
GRANT ALL ON ALL TABLES IN SCHEMA public TO esg_privileged;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO esg_privileged;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO esg_privileged;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO esg_privileged;

-- 2. Application role for normal subsidiary traffic.
--    NOT a superuser, NOT bypassing RLS — so the tenant_isolation policies
--    actually take effect. This is what DATABASE_URL must connect as.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'esg_app') THEN
    CREATE ROLE esg_app LOGIN PASSWORD 'password_app';
  END IF;
END $$;
GRANT CONNECT ON DATABASE esg_dev TO esg_app;
GRANT USAGE ON SCHEMA public TO esg_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO esg_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO esg_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO esg_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO esg_app;
