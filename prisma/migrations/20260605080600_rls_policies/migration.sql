-- Row-Level Security: tenant isolation on MetricEntry.
-- See agent_docs/data-model.md for the contract.
--
-- Two escape hatches are intentional:
--   1. `app.current_tenant_id` is set per-transaction via withTenantContext() for
--      SUBSIDIARY_OFFICER role queries.
--   2. `app.bypass_rls = 'on'` is set at the ROLE level for esg_privileged, which
--      backs the globalPrisma client used by CORPORATE_ANALYST / GLOBAL_ADMIN.
--
-- If neither setting is present, every row is filtered out — fail closed.

ALTER TABLE "MetricEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MetricEntry" FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_select ON "MetricEntry"
  FOR SELECT
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

CREATE POLICY tenant_isolation_insert ON "MetricEntry"
  FOR INSERT
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

CREATE POLICY tenant_isolation_update ON "MetricEntry"
  FOR UPDATE
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  )
  WITH CHECK (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

CREATE POLICY tenant_isolation_delete ON "MetricEntry"
  FOR DELETE
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );

-- Grant the privileged role access to the tables (it was created before they existed).
GRANT ALL ON ALL TABLES IN SCHEMA public TO esg_privileged;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO esg_privileged;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO esg_privileged;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO esg_privileged;
