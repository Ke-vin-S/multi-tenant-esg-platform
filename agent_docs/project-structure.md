# Project Folder Hierarchy

This file defines the intended structure for the ESG PoC. Use this as the source of truth when creating new files.

```
esg-platform/
│
├── CLAUDE.md
├── CLAUDE.local.md          (gitignored — personal dev overrides)
├── agent_docs/
│   ├── data-model.md
│   ├── auth.md
│   ├── sector-profiles.md
│   └── calculations.md
│
├── .env.local               (gitignored)
├── .env.example             (committed — no secrets)
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── eslint.config.mjs
├── docker-compose.yml       (local postgres)
│
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│       ├── 001_initial_schema/
│       └── 002_rls_policies/   (raw SQL migration for RLS)
│
├── lib/
│   ├── prisma.ts            (Prisma client singleton + withTenantContext + globalPrisma)
│   ├── auth.ts              (verifyToken, AuthContext type)
│   ├── emission-factors.ts  (EMISSION_FACTORS map, getEmissionFactor)
│   ├── co2e.ts              (calculateCO2e)
│   └── s3.ts                (uploadEvidence, getPresignedUrl)
│
├── app/
│   ├── layout.tsx           (root layout — fonts, providers)
│   ├── page.tsx             (redirect → /overview or /login)
│   │
│   ├── (auth)/
│   │   ├── layout.tsx       (no sidebar — centered card)
│   │   ├── login/
│   │   │   └── page.tsx     (Cognito Hosted UI redirect trigger)
│   │   └── callback/
│   │       └── page.tsx     (token exchange → cookie → redirect)
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx       (sidebar + navbar shell)
│   │   │
│   │   ├── overview/
│   │   │   └── page.tsx     (Subsidiary Officer home — KPI cards + line chart + donut)
│   │   │
│   │   ├── data-entry/
│   │   │   └── page.tsx     (DynamicMetricForm — fetches sector definitions)
│   │   │
│   │   ├── audit-ledger/
│   │   │   └── page.tsx     (table of past MetricEntry rows for this tenant)
│   │   │
│   │   └── global/          (CORPORATE_ANALYST + GLOBAL_ADMIN only)
│   │       ├── page.tsx     (Global overview — KPI cards + stacked bar + leaderboard)
│   │       ├── sector/
│   │       │   └── [profile]/
│   │       │       └── page.tsx  (Sector deep-dive — filtered by SectorProfile)
│   │       └── tenants/
│   │           └── page.tsx (Tenant directory — compliance status per subsidiary)
│   │
│   └── api/
│       ├── metrics/
│       │   ├── route.ts           (GET list for tenant, POST submit)
│       │   └── definitions/
│       │       └── route.ts       (GET MetricDefinitions by sector profile)
│       ├── metrics/aggregate/
│       │   └── route.ts           (GET global aggregation — analyst only)
│       ├── tenants/
│       │   └── route.ts           (GET list, POST provision — admin only)
│       └── evidence/
│           └── route.ts           (POST → S3 upload, returns evidenceUrl)
│
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx            (role-aware nav links)
│   │   ├── Navbar.tsx             (user name, role badge, tenant name)
│   │   └── RoleGuard.tsx          (client-side role check wrapper)
│   │
│   ├── forms/
│   │   ├── DynamicMetricForm.tsx  (core form — renders fields from MetricDefinition list)
│   │   ├── MonthPicker.tsx
│   │   └── FileUploadZone.tsx     (drag-drop PDF/PNG → POSTs to /api/evidence)
│   │
│   ├── charts/
│   │   ├── EmissionLineChart.tsx  (12-month CO2e trend — Recharts LineChart)
│   │   ├── ResourceDonutChart.tsx (emissions by source — Recharts PieChart)
│   │   ├── SectorBarChart.tsx     (stacked bar — CO2e by sector — Recharts BarChart)
│   │   └── SubsidiaryLeaderboard.tsx (data table — ranked by CO2e)
│   │
│   └── ui/
│       ├── KpiCard.tsx            (big number card with delta badge)
│       ├── ComplianceBadge.tsx    (green/amber/red — submitted vs missing)
│       └── LoadingSpinner.tsx
│
├── hooks/
│   ├── useAuth.ts               (reads auth context from cookie/session)
│   └── useMetricDefinitions.ts  (SWR hook for /api/metrics/definitions)
│
└── types/
    └── index.ts                 (shared TypeScript types — AuthContext, MetricEntry, etc.)
```

## Key Conventions

- All server-side data fetching happens in **API routes** (`app/api/`), not in Server Components directly, to keep auth verification centralized
- Page components are **Client Components** (`'use client'`) that fetch from the API routes via `fetch` or SWR
- Exception: pages that only need static/aggregated data can be Server Components that call the API route handler function directly (not via HTTP)
- All chart components receive data as props — no internal fetching
- `lib/` contains pure logic with no Next.js dependencies (importable in both API routes and server actions)
