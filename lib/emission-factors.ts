/**
 * Emission factor map.
 *
 * Keys are `${metricType}::${region}` with a fallback to `${metricType}::DEFAULT`.
 * All factors in kg CO2e per unit of the metric.
 *
 * Sources: IEA 2023, DEFRA 2023, GHG Protocol.
 * Hardcoded by design — no external EF API in the PoC (see CLAUDE.md / calculations.md).
 */
type EmissionFactorKey = `${string}::${string}`;

export const EMISSION_FACTORS: Record<EmissionFactorKey, number> = {
  // Grid Electricity (kg CO2e per kWh)
  'env_electricity_purchased::LK': 0.55,
  'env_electricity_purchased::KH': 0.64,
  'env_electricity_purchased::MV': 0.72,
  'env_electricity_purchased::PH': 0.52,
  'env_electricity_purchased::TZ': 0.44,
  'env_electricity_purchased::DEFAULT': 0.6,

  // Diesel / fuel oil (kg CO2e per liter)
  'env_generator_fuel::DEFAULT': 2.68,
  'env_tractor_diesel::DEFAULT': 2.68,
  'env_vehicle_fuel::DEFAULT': 2.31,
};

export function getEmissionFactor(metricType: string, region: string): number | null {
  const exact = EMISSION_FACTORS[`${metricType}::${region}`];
  if (exact !== undefined) return exact;
  const fallback = EMISSION_FACTORS[`${metricType}::DEFAULT`];
  return fallback ?? null;
}
