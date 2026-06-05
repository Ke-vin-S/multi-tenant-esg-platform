# ESG Carbon Footprint Aggregation Platform (PoC)

A multi-tenant ESG data collection and reporting platform targeting conglomerates with distributed subsidiaries. The PoC validates three core engineering concepts: strict tenant data isolation via PostgreSQL Row-Level Security, sector-specific dynamic form rendering, and cross-sector CO2e normalization into a single aggregated dashboard.

The domain context is modeled after LOLC Holdings (Sri Lanka) — a diversified conglomerate spanning financial services, agriculture, and leisure. Sector profiles drive which metrics are visible per tenant.

## Stack

- **Frontend + API Routes**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Recharts
- **ORM**: Prisma (handles migrations and type-safe queries)
- **Database**: PostgreSQL with Row-Level Security (RLS) enforced at the DB level
- **Auth + Multi-Tenancy**: AWS Cognito (user pools, JWT tokens carry `tenant_id` and `role` custom attributes)
- **File Storage**: AWS S3 (audit evidence — PDFs/images linked via `evidence_url` in DB)
- **Emission Factors**: Hardcoded static JSON map in `lib/emission-factors.ts` (no external API for PoC)

## Project Structure

```
/
├── CLAUDE.md
├── agent_docs/
│   ├── data-model.md        # Schema, RLS policies, Prisma models
│   ├── auth.md              # Cognito setup, JWT claims, middleware
│   ├── sector-profiles.md   # Metric taxonomy per sector
│   └── calculations.md      # CO2e math, emission factor map
├── app/                     # Next.js App Router
│   ├── (auth)/              # Login page (no layout shell)
│   ├── (dashboard)/         # Protected routes — layout with sidebar
│   │   ├── overview/        # Subsidiary-scoped dashboard
│   │   ├── data-entry/      # Dynamic metric submission form
│   │   ├── audit-ledger/    # Historical submissions per tenant
│   │   └── global/          # Corporate analyst view (role-gated)
│   └── api/                 # Next.js API routes (act as BFF)
│       ├── metrics/         # POST submit, GET list
│       └── tenants/         # Admin provisioning
├── lib/
│   ├── emission-factors.ts  # Static EF map by metric type + region
│   ├── co2e.ts              # calculateCO2e(value, metricType, region)
│   ├── auth.ts              # Cognito token verification helpers
│   └── prisma.ts            # Prisma client singleton
├── prisma/
│   ├── schema.prisma
│   └── seed.ts              # Seeds tenants + demo users
└── components/
    ├── charts/              # Recharts wrappers (LineChart, DonutChart, BarChart)
    ├── forms/               # DynamicMetricForm, FileUploadZone
    └── layout/              # Sidebar, Navbar, RoleGuard
```

## Development

```bash
# Install
npm install

# Local DB (requires Docker)
docker compose up -d postgres

# Migrate + seed
npx prisma migrate dev
npx prisma db seed

# Run
npm run dev

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

## Environment

```bash
# .env.local
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."         # Prisma needs this for RLS bypass in migrations

NEXT_PUBLIC_COGNITO_USER_POOL_ID=""
NEXT_PUBLIC_COGNITO_CLIENT_ID=""
COGNITO_REGION="ap-southeast-1"

AWS_S3_BUCKET=""
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

## Architecture Notes

- **RLS is the security boundary.** Every query from an authenticated subsidiary user must pass through RLS. See @agent_docs/auth.md for how the Cognito JWT `tenant_id` claim is passed to PostgreSQL via `SET LOCAL app.current_tenant_id`.
- **Role gates at two levels**: Next.js middleware blocks routes by role, AND the DB enforces it via RLS. Never rely on only one.
- **Sector profiles are DB-driven**, not hardcoded in the UI. The `MetricDefinition` table maps which metrics belong to which `SectorProfile`. The `DynamicMetricForm` fetches this at render time.
- **CO2e calculation happens server-side** in the API route — never in the browser. Raw value + normalized CO2e are both stored in `MetricEntry`.
- **Global analyst role bypasses RLS** via a privileged DB connection (separate Prisma client). See @agent_docs/auth.md.

## Gotchas

- Prisma does not support RLS natively. Use `$executeRaw` to `SET LOCAL app.current_tenant_id = $1` before tenant-scoped queries. See @agent_docs/data-model.md for the pattern.
- Cognito JWTs must be verified with the public JWKS endpoint, not decoded naively. Use `aws-jwt-verify` library.
- `DIRECT_URL` in `.env` bypasses the connection pooler — required for Prisma migrations to work with RLS.
- Emission factors are hardcoded for the PoC. See @agent_docs/calculations.md for the full map. Do not add external API calls.

## Never Do

- NEVER disable RLS or add a superuser bypass outside the designated `globalPrisma` client.
- NEVER expose `tenant_id` assignment to the client — it must come from the verified Cognito JWT only.
- NEVER store EF values in the UI or client-side code.
- NEVER design migrations that drop the `tenant_id` column or RLS policies without explicit instruction.

## Reference Docs

Read the relevant file before working on that area:

- @agent_docs/project-structure.md — full folder hierarchy and file conventions
- @agent_docs/data-model.md — Prisma schema, RLS policies, migration patterns
- @agent_docs/auth.md — Cognito integration, JWT verification, middleware, role-gating
- @agent_docs/sector-profiles.md — metric taxonomy, sector profiles, dynamic form logic
- @agent_docs/calculations.md — CO2e formulas, emission factor map, normalization rules
