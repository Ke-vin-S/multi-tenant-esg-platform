# Data Model & Database

## Prisma Schema Overview

```prisma
// prisma/schema.prisma

model Tenant {
  id            String          @id @default(cuid())
  name          String
  sectorProfile SectorProfile
  region        String          // e.g. "LK", "KH", "MV" — drives EF lookup
  createdAt     DateTime        @default(now())
  users         User[]
  metricEntries MetricEntry[]
}

enum SectorProfile {
  FINANCIAL
  AGRICULTURE
  LEISURE
}

model User {
  id        String   @id @default(cuid())
  cognitoId String   @unique  // sub from Cognito JWT
  tenantId  String
  role      Role
  tenant    Tenant   @relation(fields: [tenantId], references: [id])
}

enum Role {
  SUBSIDIARY_OFFICER
  CORPORATE_ANALYST
  GLOBAL_ADMIN
}

model MetricDefinition {
  id            String        @id @default(cuid())
  name          String        // e.g. "Grid Electricity"
  metricType    String        // e.g. "env_electricity_purchased"
  unit          String        // e.g. "kWh"
  sectorProfile SectorProfile // which sector sees this form field
  scope         EmissionScope?
  entries       MetricEntry[]
}

enum EmissionScope {
  SCOPE_1
  SCOPE_2
  SCOPE_3
}

model MetricEntry {
  id               String           @id @default(cuid())
  tenantId         String
  metricDefinition MetricDefinition @relation(fields: [metricDefinitionId], references: [id])
  metricDefinitionId String
  rawValue         Float
  unit             String
  co2eKg           Float?           // null for non-carbon metrics (social/governance)
  reportingMonth   DateTime         // first day of the month, e.g. 2026-05-01
  evidenceUrl      String?          // S3 key to the uploaded PDF/image
  submittedAt      DateTime         @default(now())
  tenant           Tenant           @relation(fields: [tenantId], references: [id])
}
```

## Row-Level Security (RLS)

RLS is enforced at the PostgreSQL level. Prisma does not handle this natively — use raw SQL for the session variable.

### Enable RLS on MetricEntry table

```sql
-- Run once during migration or in a raw migration file
ALTER TABLE "MetricEntry" ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON "MetricEntry"
  USING (
    "tenantId" = current_setting('app.current_tenant_id', true)
    OR current_setting('app.bypass_rls', true) = 'on'
  );
```

### Setting the tenant context per request

In every API route that is tenant-scoped, set the session variable before querying:

```ts
// lib/prisma.ts — tenant-scoped query helper
export async function withTenantContext<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  });
}
```

### Bypassing RLS for Corporate Analyst

Use a separate Prisma client connected as a privileged DB user:

```ts
// lib/prisma.ts
export const globalPrisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL_PRIVILEGED } },
});
// This user has app.bypass_rls = 'on' set at the role level in PostgreSQL
```

## Migration Patterns

- All schema changes go through `npx prisma migrate dev --name <description>`
- NEVER edit migration files after they've been applied
- RLS policies are added as raw SQL in a dedicated migration file (not via Prisma schema)
- Seed file (`prisma/seed.ts`) creates: 3 tenants (LOLC Finance, Browns Plantations, Eden Resorts), metric definitions per sector, and 3 demo users

## Key Query Patterns

### Get metrics for a tenant (scoped)
```ts
const entries = await withTenantContext(tenantId, (tx) =>
  tx.metricEntry.findMany({
    where: { reportingMonth: { gte: startOfYear } },
    include: { metricDefinition: true },
    orderBy: { reportingMonth: 'desc' },
  })
);
```

### Global aggregation (analyst, bypasses RLS)
```ts
const totals = await globalPrisma.metricEntry.groupBy({
  by: ['tenantId'],
  _sum: { co2eKg: true },
  where: { reportingMonth: { gte: fiscalYearStart } },
});
```

## Non-Carbon Metrics Storage

Social and governance metrics (e.g., total training hours, incident count) are stored in `MetricEntry` with `co2eKg = null`. The calculation layer skips the EF multiplication and stores `rawValue` directly. Aggregation queries filter by `MetricDefinition.scope` to separate carbon vs. non-carbon metrics.
