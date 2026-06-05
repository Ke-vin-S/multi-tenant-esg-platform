# Sector Profiles & Metric Taxonomy

## The Three Sectors (PoC scope)

| Sector Profile | Example Tenant | Primary Concern |
|---|---|---|
| `FINANCIAL` | LOLC Finance Cambodia | Electricity, generator fuel, financed emissions |
| `AGRICULTURE` | Browns Plantations | Tractor diesel, water usage, fertilizer |
| `LEISURE` | Eden Resorts Maldives | Electricity, diesel, water per guest night |

## Metric Definitions by Sector

These are seeded in `prisma/seed.ts` as `MetricDefinition` records.

### FINANCIAL Sector

| metricType | name | unit | scope | co2e? |
|---|---|---|---|---|
| `env_electricity_purchased` | Grid Electricity | kWh | SCOPE_2 | ✅ |
| `env_generator_fuel` | Generator Diesel | liters | SCOPE_1 | ✅ |
| `env_vehicle_fuel` | Vehicle Fleet Fuel | liters | SCOPE_1 | ✅ |
| `soc_headcount_total` | Total Headcount | count | — | ❌ |
| `soc_training_hours` | Total Training Hours | hours | — | ❌ |
| `gov_anticorruption_trained` | Anti-Corruption Trained | count | — | ❌ |

### AGRICULTURE Sector

| metricType | name | unit | scope | co2e? |
|---|---|---|---|---|
| `env_tractor_diesel` | Tractor Diesel | liters | SCOPE_1 | ✅ |
| `env_water_usage` | Water Usage | cubic_meters | — | ❌ |
| `env_fertilizer_applied` | Fertilizer Applied | kg | — | ❌ |
| `env_electricity_purchased` | Grid Electricity | kWh | SCOPE_2 | ✅ |
| `soc_headcount_total` | Total Headcount | count | — | ❌ |
| `soc_recordable_incidents` | Recordable Safety Incidents | count | — | ❌ |

### LEISURE Sector

| metricType | name | unit | scope | co2e? |
|---|---|---|---|---|
| `env_electricity_purchased` | Grid Electricity | kWh | SCOPE_2 | ✅ |
| `env_generator_fuel` | Generator Diesel | liters | SCOPE_1 | ✅ |
| `env_water_per_guest_night` | Water per Guest Night | liters | — | ❌ |
| `env_waste_generated` | Waste Generated | kg | — | ❌ |
| `soc_headcount_total` | Total Headcount | count | — | ❌ |

## Dynamic Form Rendering Logic

The `DynamicMetricForm` component:

1. On mount, calls `GET /api/metrics/definitions?sector=<tenant.sectorProfile>`
2. The API returns the list of `MetricDefinition` records for that sector
3. The form renders one input field per definition (number input + unit label)
4. Includes a month picker (defaults to current month)
5. Includes a file upload zone (PDF/PNG) per submission batch

The form does NOT hardcode any metric names. All field labels, units, and visibility come from the DB response.

## Adding a New Metric

1. Add a row to `MetricDefinition` in the seed or via a migration
2. If it requires CO2e, add an entry to the emission factor map in `lib/emission-factors.ts`
3. No UI code changes required — the form renders it automatically

IMPORTANT: The sector profile → metric mapping is the core "extensibility" claim of the PoC. Do not short-circuit this by hardcoding form fields.

## Non-Carbon Metrics in the Dashboard

For metrics where `co2eKg` is null (water, headcount, incidents, etc.), the subsidiary dashboard shows them in a separate "Resource & Social Metrics" section as plain numbers, not on the CO2e chart.

The global analyst dashboard only aggregates CO2e metrics in the main chart. Non-carbon metrics are shown in a separate stats table per tenant on the drill-down view.
