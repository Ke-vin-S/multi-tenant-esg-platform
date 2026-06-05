# CO2e Calculations & Emission Factors

## Core Formula

```
CO2e (kg) = raw_value × emission_factor
```

The emission factor (EF) is looked up by `(metricType, region)`. The result is stored in `MetricEntry.co2eKg`.

## Implementation

```ts
// lib/emission-factors.ts
// All factors in kg CO2e per unit
// Sources: IEA 2023, DEFRA 2023, GHG Protocol

type EmissionFactorKey = `${string}::${string}`; // "metricType::region"

export const EMISSION_FACTORS: Record<EmissionFactorKey, number> = {
  // Grid Electricity (kg CO2e per kWh)
  'env_electricity_purchased::LK':  0.55,  // Sri Lanka — Ceylon Electricity Board avg
  'env_electricity_purchased::KH':  0.64,  // Cambodia
  'env_electricity_purchased::MV':  0.72,  // Maldives (diesel-heavy grid)
  'env_electricity_purchased::PH':  0.52,  // Philippines
  'env_electricity_purchased::TZ':  0.44,  // Tanzania
  'env_electricity_purchased::DEFAULT': 0.60, // fallback

  // Diesel / Fuel Oil (kg CO2e per liter)
  'env_generator_fuel::DEFAULT':    2.68,
  'env_tractor_diesel::DEFAULT':    2.68,
  'env_vehicle_fuel::DEFAULT':      2.31,

  // No EF — these are not CO2e metrics
  // env_water_usage, env_fertilizer_applied, env_water_per_guest_night,
  // env_waste_generated, soc_*, gov_* — all return null
};

export function getEmissionFactor(metricType: string, region: string): number | null {
  return (
    EMISSION_FACTORS[`${metricType}::${region}`] ??
    EMISSION_FACTORS[`${metricType}::DEFAULT`] ??
    null
  );
}
```

```ts
// lib/co2e.ts
import { getEmissionFactor } from './emission-factors';

export function calculateCO2e(
  rawValue: number,
  metricType: string,
  region: string
): number | null {
  const ef = getEmissionFactor(metricType, region);
  if (ef === null) return null; // non-carbon metric
  return rawValue * ef;
}
```

## Usage in API Route

```ts
// app/api/metrics/route.ts (POST handler)
const co2eKg = calculateCO2e(body.rawValue, metricDef.metricType, tenant.region);

await withTenantContext(auth.tenantId, (tx) =>
  tx.metricEntry.create({
    data: {
      tenantId: auth.tenantId,
      metricDefinitionId: body.metricDefinitionId,
      rawValue: body.rawValue,
      unit: metricDef.unit,
      co2eKg,                      // null for non-carbon metrics
      reportingMonth: body.reportingMonth,
      evidenceUrl: body.evidenceUrl ?? null,
    },
  })
);
```

## Framework Compliance Mapping (for PoC documentation)

| Metric | Framework Reference | Calculation |
|---|---|---|
| Scope 1 GHG (fuel combustion) | ESRS E1-6, GRI 305-1 | `liters × EF_fuel` |
| Scope 2 GHG (purchased electricity) | ESRS E1-6, GRI 305-2 | `kWh × EF_grid` |
| GHG Intensity | ESRS E1-6, GRI 305-4 | `total_co2e_kg / revenue` (HQ-level only) |
| Recordable Incident Rate | ESRS S1-14, GRI 403-9 | `(incidents / total_hours) × 1,000,000` |
| Anti-Corruption Training % | ESRS G1-3, GRI 205-2 | `(trained / headcount) × 100` |

Note: GHG Intensity requires revenue data (not in MetricEntry). It is computed at the HQ analyst level as a derived metric, not stored per entry.

## Aggregation for Global Dashboard

```ts
// Total CO2e by tenant for current fiscal year
const byTenant = await globalPrisma.metricEntry.groupBy({
  by: ['tenantId'],
  _sum: { co2eKg: true },
  where: {
    reportingMonth: { gte: fiscalYearStart, lte: fiscalYearEnd },
    co2eKg: { not: null },
  },
});

// Total CO2e by scope (Scope 1 vs Scope 2)
const byScope = await globalPrisma.$queryRaw`
  SELECT md.scope, SUM(me."co2eKg") as total
  FROM "MetricEntry" me
  JOIN "MetricDefinition" md ON me."metricDefinitionId" = md.id
  WHERE me."reportingMonth" >= ${fiscalYearStart}
    AND me."co2eKg" IS NOT NULL
  GROUP BY md.scope
`;
```

## Important Constraints

- EF values are hardcoded for the PoC — do NOT add external API calls (Climatiq etc.) in the PoC phase
- If a region has no EF entry, always fall back to `DEFAULT` — never throw an error
- Store CO2e in **kg** in the DB. Convert to **tonnes (tCO2e)** only at the display layer (`kg / 1000`)
- Both `rawValue` and `co2eKg` must be stored — auditors need the original submitted number
