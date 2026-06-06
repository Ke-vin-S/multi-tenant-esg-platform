# ESG Carbon Footprint Aggregation Platform (PoC)

A multi-tenant ESG data collection and reporting platform for conglomerates with distributed subsidiaries. Validates three engineering claims end-to-end:

1. **Strict tenant data isolation** — PostgreSQL Row-Level Security at the DB, not just the app
2. **Sector-driven dynamic forms** — metric fields rendered from `MetricDefinition` rows, not hardcoded
3. **Cross-sector CO₂e normalization** — raw consumption → emission-factor lookup → kg CO₂e, aggregated across subsidiaries

Domain modelled after LOLC Holdings (Sri Lanka): financial services, agriculture, leisure.

---

## TL;DR — Run it locally

```bash
# 1. Start Postgres (docker)
docker compose up -d postgres

# 2. Create the application + privileged DB roles (one-off)
docker exec -i $(docker compose ps -q postgres) \
  psql -U postgres -d esg_dev < scripts/setup-roles.sql

# 3. Install + migrate + seed
npm install
npx prisma migrate deploy
npx tsx prisma/seed.ts

# 4. Run
npm run dev   # → http://localhost:3000/login
```

No AWS provisioning required. Sign in at `/login` as any seeded persona (one-click).

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router), TypeScript |
| Styling | Tailwind CSS · custom `brand`/`ink` palette |
| ORM | Prisma 5 |
| DB | PostgreSQL 16 with **Row-Level Security** |
| Auth | AWS Cognito (`aws-jwt-verify`) + dev-bypass signed cookie |
| Storage | AWS S3 (`@aws-sdk/client-s3` + presigned URLs) + local fallback |
| Charts | Recharts |
| Tests | Vitest (unit) + Vitest+Postgres (integration) |

---

## Project structure

```
.
├── app/                       Next.js App Router
│   ├── (auth)/login           Persona picker (dev) / Cognito redirect (prod)
│   ├── (dashboard)/
│   │   ├── overview           Subsidiary KPI + trend + donut
│   │   ├── data-entry         DynamicMetricForm (renders from DB)
│   │   ├── audit-ledger       Submission table per tenant
│   │   └── global/            Analyst/Admin only
│   │       ├── page.tsx       Group KPIs + stacked bar + leaderboard
│   │       ├── sector/[profile]/  Sector deep-dive
│   │       └── tenants/       Compliance directory
│   └── api/
│       ├── auth/{dev-login,callback,logout,me}
│       ├── metrics            GET (tenant-scoped) · POST (officer-only)
│       ├── metrics/definitions
│       ├── metrics/aggregate  Analyst-only group totals
│       ├── tenants            Compliance summary
│       └── evidence/[key]     Upload + secure read
│
├── lib/
│   ├── prisma.ts              Singleton + withTenantContext + withGlobalContext + globalPrisma
│   ├── auth.ts                requireAuth, requireRole, Cognito verifier
│   ├── dev-session.ts         HMAC-signed local session (dev only)
│   ├── emission-factors.ts    EF map by metricType::region
│   ├── co2e.ts                calculateCO2e
│   ├── fetcher.ts             SWR fetcher with centralised 401 → login redirect
│   ├── s3.ts                  Upload + local-fallback storage
│   └── utils.ts               cn, formatters, date helpers
│
├── components/
│   ├── ui/                    Button, Card, Badge, KpiCard, ComplianceBadge, Input, EmptyState, LoadingSpinner
│   ├── layout/                Sidebar, Navbar, RoleGuard, AuthGuard, ThemeSync
│   ├── forms/                 DynamicMetricForm, MonthPicker, FileUploadZone
│   └── charts/                EmissionLineChart, ResourceDonutChart, SectorBarChart, SubsidiaryLeaderboard
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   │   ├── 20260605080506_initial_schema/
│   │   └── 20260605080600_rls_policies/   ← RAW SQL — RLS policies live here
│   └── seed.ts
│
├── tests/
│   ├── unit/                  co2e, emission-factors, auth, dev-session, utils
│   └── integration/           rls.test.ts, api-routes.test.ts (real Postgres)
│
├── scripts/setup-roles.sql    Creates esg_app + esg_privileged roles
├── docker-compose.yml         Postgres 16
├── middleware.ts              Route gating (UX layer)
└── agent_docs/                Spec — data-model, auth, sector-profiles, calculations
```

---

## How tenant isolation actually works

This is the core of the PoC. **Three layers** defend in depth:

| Layer | Mechanism | What it stops |
|---|---|---|
| Middleware | Cookie check + role decode → redirect | Casual access to wrong route |
| API route | `requireAuth()` → JWT verify → `requireRole()` | Forged role claims, missing auth |
| **PostgreSQL RLS** | `tenant_isolation_*` policies on `MetricEntry` | App-layer bugs, leaked tenantId, SQL injection |

The DB layer is the security boundary. Even if the app code passes the wrong `tenantId` to a query, RLS still filters rows.

```ts
// Every officer query goes through this wrapper:
await withTenantContext(auth.tenantId, (tx) =>
  tx.metricEntry.findMany(/* ... */)
)
// → sets app.current_tenant_id in a TX-scoped session var
// → RLS policy filters MetricEntry rows on tenantId = current_setting(...)
```

```ts
// Analyst/Admin (cross-tenant) traffic goes through withGlobalContext:
await withGlobalContext(async (tx) => {
  const tenants = await tx.tenant.findMany({ ... });
  const entries = await tx.metricEntry.findMany({ where: { tenantId: { in: tenantIds } } });
  return { tenants, entries };
});
// → runs inside a $transaction, sets set_config('app.bypass_rls','on',true) before queries
// → RLS policy checks the bypass flag and allows cross-tenant reads
```

`DATABASE_URL` MUST connect as a non-superuser (we use `esg_app`). Postgres superusers bypass RLS unconditionally — the integration tests catch this.

> **PgBouncer note:** `ALTER ROLE esg_privileged SET app.bypass_rls = 'on'` is NOT reliable when using PgBouncer in transaction-pooling mode (e.g. Neon). Session-level role settings are silently lost. Always use the `withGlobalContext` wrapper which calls `set_config(...)` inside the transaction itself.

---

## Auth model

Three roles, two code paths.

| Role | Dashboard | DB client | Can write? |
|---|---|---|---|
| `SUBSIDIARY_OFFICER` | `/overview` | `prisma` + `withTenantContext` | ✅ own tenant |
| `CORPORATE_ANALYST` | `/global` | `globalPrisma` | ❌ read-only |
| `GLOBAL_ADMIN` | `/global` (+ `/admin`) | `globalPrisma` | ❌ read-only here |

**Production path:** Cognito Hosted UI → `/api/auth/callback` exchanges code for `id_token` → cookie → `aws-jwt-verify` checks JWKS on every API call → `tenantId` + `role` from `custom:*` claims.

**Local-dev path:** `DEV_AUTH_BYPASS=true` enables `/api/auth/dev-login` → POST `{ email }` → looks up seeded user → mints HMAC-SHA256-signed cookie → same `AuthContext` downstream. Disable this in any deployed environment.

---

## CO₂e calculation

```
co2eKg = rawValue × EF[metricType::region]   // falls back to ::DEFAULT, else null
```

- Always **server-side** in the POST handler — never trust client-computed values
- Both `rawValue` and `co2eKg` stored — auditors need the original number
- `co2eKg = null` for non-carbon metrics (water, headcount, incidents)
- EF map is **hardcoded** in `lib/emission-factors.ts` per PoC scope (no external API)

See `agent_docs/calculations.md` for the full EF table and framework mapping (ESRS E1-6, GRI 305).

---

## Sector profiles

Metric definitions are **DB-driven**, not hardcoded in the UI. `DynamicMetricForm` fetches `/api/metrics/definitions?sector=<X>` and renders one field per row.

| Sector | Demo tenant | Region | Carbon metrics | Non-carbon |
|---|---|---|---|---|
| `FINANCIAL` | LOLC Finance Cambodia | KH | Electricity, generator, vehicles | Headcount, training, anti-corruption |
| `AGRICULTURE` | Browns Plantations | LK | Tractor diesel, grid electricity | Water, fertilizer, incidents |
| `LEISURE` | Eden Resorts Maldives | MV | Electricity, generator | Water/guest-night, waste |

Adding a new metric = insert one `MetricDefinition` row + (optionally) one EF entry. No UI changes.

---

## Environment

`.env.local` (gitignored — already set up for the docker-compose stack):

```bash
# DB — esg_app is NON-superuser so RLS actually enforces
DATABASE_URL="postgresql://esg_app:password_app@localhost:5432/esg_dev"
DIRECT_URL="postgresql://postgres:password@localhost:5432/esg_dev"      # migrations
DATABASE_URL_PRIVILEGED="postgresql://esg_privileged:password_privileged@localhost:5432/esg_dev"

# Dev escape hatches — DO NOT ship these set to true
DEV_AUTH_BYPASS="true"
DEV_SESSION_SECRET="dev-only-not-secret-change-me"
DEV_S3_LOCAL="true"

# Production wiring (unset in dev)
NEXT_PUBLIC_COGNITO_USER_POOL_ID=""
NEXT_PUBLIC_COGNITO_CLIENT_ID=""
NEXT_PUBLIC_COGNITO_DOMAIN=""
COGNITO_REGION="ap-southeast-1"
AWS_S3_BUCKET=""
AWS_S3_REGION="ap-southeast-1"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
```

See `.env.example` for the full list.

---

## Demo personas

After `npx tsx prisma/seed.ts` the dev login picker shows:

| Email | Role | Tenant | Sector |
|---|---|---|---|
| `subsidiary_officer@test.com` | Officer | Browns Plantations | AGRICULTURE |
| `officer_lolc@test.com` | Officer | LOLC Finance Cambodia | FINANCIAL |
| `officer_eden@test.com` | Officer | Eden Resorts Maldives | LEISURE |
| `analyst@test.com` | Corporate Analyst | — | — |
| `admin@test.com` | Global Admin | — | — |

Each tenant is pre-loaded with 12 months of plausible historical metrics so dashboards aren't empty on first sign-in.

---

## Scripts

```bash
npm run dev               # next dev
npm run build             # production build
npm run start             # next start (after build)

npm run typecheck         # tsc --noEmit
npm run lint              # next lint

npm test                  # unit tests (vitest)
npm run test:integration  # integration tests against Postgres
npm run test:all          # both

npm run db:migrate        # prisma migrate dev
npm run db:reset          # prisma migrate reset (drops + re-applies + seeds)
npm run db:seed           # re-seed demo data only
npm run db:studio         # prisma studio
```

**Heads-up:** the integration tests wipe the DB between suites. Run `npm run db:seed` after `npm run test:all` to restore the demo personas.

**Cognito re-seed:** if you drop and re-create tenants (new CUIDs), the `custom:tenant_id` attribute on Cognito users goes stale. Re-sync with:

```bash
npx prisma db seed -- --cognito
```

This updates each Cognito user's `custom:tenant_id` to match the current seeded IDs. Without this, `/api/auth/me` returns 404 for all users after a fresh seed.

---

## Testing

**39 tests total — all green.**

| Suite | Count | Covers |
|---|---|---|
| `tests/unit/emission-factors.test.ts` | 4 | Region lookup, DEFAULT fallback, null for non-carbon |
| `tests/unit/co2e.test.ts` | 5 | Formula, region fallback, null handling, zero |
| `tests/unit/dev-session.test.ts` | 4 | Round-trip, tamper detection, expiry, malformed input |
| `tests/unit/auth.test.ts` | 7 | `parseCookies`, `requireRole` per role pair |
| `tests/unit/utils.test.ts` | 5 | Number/tonne formatting, UTC month/FY helpers |
| `tests/integration/rls.test.ts` | 6 | **Tenant isolation**, cross-tenant insert rejection, fail-closed without context, `globalPrisma` bypass, no context leak |
| `tests/integration/api-routes.test.ts` | 8 | 401 paths, sector mismatch rejection, server-computed CO₂e correctness, analyst/officer role gates |

The integration suite is the load-bearing one — it proves RLS at the actual Postgres layer, not just in app code.

---

## Production checklist (when you wire Cognito + S3)

- [ ] Provision Cognito User Pool with `custom:tenant_id` + `custom:role` attributes
- [ ] Set `NEXT_PUBLIC_COGNITO_*` and `COGNITO_REGION`
- [ ] Provision S3 bucket; set `AWS_S3_BUCKET` + credentials
- [ ] **Remove** `DEV_AUTH_BYPASS` and `DEV_S3_LOCAL` from the environment
- [ ] Rotate `DEV_SESSION_SECRET` out of any deployed env file (it's only for local dev)
- [ ] Confirm `DATABASE_URL` points to a non-superuser role with policies enforced
- [ ] Run `scripts/setup-roles.sql` against the prod DB (or equivalent)

---

## Deploying to Vercel + Neon

`vercel.json` locks the build command to `npm run build` so Vercel never runs `prisma migrate deploy` in the build container. Build containers use ephemeral IPs that may not match your database allowlist.

**One-time setup:**

1. Set **Neon IP allowlist → "No restrictions"** (or allowlist Vercel's function IPs). Without this every API call fails with `P1001 Can't reach database server`.
2. Run migrations against your Neon database manually before first deploy:
   ```bash
   DATABASE_URL="postgresql://..." npx prisma migrate deploy
   ```
3. Seed demo data (including Cognito sync if applicable):
   ```bash
   DATABASE_URL="postgresql://..." npx prisma db seed -- --cognito
   ```
4. Set all required environment variables in the Vercel dashboard (see `.env.example`).

**Cookie `secure` flag:** The `id_token` cookie is set `Secure` only when the `VERCEL` environment variable is present (automatically set by Vercel). It is NOT gated on `NODE_ENV=production`, so `npm run build && npm run start` on localhost sends the cookie over HTTP without the `Secure` flag.

---

## Gotchas (learned the hard way)

- **Postgres superusers bypass RLS** even with `FORCE ROW LEVEL SECURITY`. Use `esg_app` (non-superuser) for `DATABASE_URL`. The integration tests catch this.
- **Prisma needs `DIRECT_URL`** to apply migrations that touch RLS — it bypasses the connection pooler.
- **`useSearchParams` in App Router** requires a `Suspense` boundary at build time. See `app/(auth)/login/page.tsx`.
- **Server-component layouts can't accept render-prop children from client components.** The Sidebar reads `useAuth()` internally instead.
- **EF lookup falls back to `::DEFAULT`** — never throws. If a region has no entry, you still get a number.
- **`co2eKg` is `null` for non-carbon metrics** (water, headcount, incidents) — aggregation queries must filter on `co2eKg IS NOT NULL`.
- **Brave + `npm run dev`**: Brave Shields block `eval()` on localhost, and Next 14 dev hardcodes `eval-source-map`. Symptom: page renders but no JS runs, no `/api/auth/dev-login` fetch fires. Fix: lion icon → Shields = Down on localhost, or use `npm run build && npm run start`, or use Chrome/Firefox. Cannot be overridden in `next.config.mjs`.
- **Hard navigation after login/logout.** `router.push` + `router.refresh` races the `Set-Cookie` write; middleware on the next request can miss the cookie and bounce you back. Use `window.location.assign(...)` instead.
- **PgBouncer transaction mode drops role-level session vars.** `ALTER ROLE esg_privileged SET app.bypass_rls = 'on'` is silently lost per connection checkout. Always use `withGlobalContext()` which calls `set_config('app.bypass_rls','on',true)` inside the transaction. Applies to Neon and any other PgBouncer-fronted pool.
- **`Script beforeInteractive` with inline content does NOT block paint in App Router.** It runs after React hydration, not before the first paint. For a flash-of-wrong-theme fix, use `<script dangerouslySetInnerHTML>` inside `<head>` (render-blocking) and pair it with a `useLayoutEffect` safety net in `ThemeSync`. See `app/layout.tsx` and `components/layout/ThemeSync.tsx`.
- **Theme system is two-layer by design.** The inline `<script>` in `<head>` sets the `dark` class before paint. `ThemeSync` re-applies the correct theme via `useLayoutEffect` after React hydrates (catches any mismatch) and also subscribes to live OS changes. Removing either layer causes a flash or a missed OS change.

---

## Reference docs

- `CLAUDE.md` — architecture notes + "never do" list
- `agent_docs/data-model.md` — schema, RLS policies, query patterns
- `agent_docs/auth.md` — Cognito setup, JWT claims, middleware
- `agent_docs/sector-profiles.md` — metric taxonomy per sector
- `agent_docs/calculations.md` — CO₂e formulas, EF map, framework mapping
- `agent_docs/project-structure.md` — folder conventions
