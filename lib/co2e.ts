import { getEmissionFactor } from './emission-factors';

/**
 * CO2e (kg) = raw_value × emission_factor(metricType, region).
 *
 * Returns null when the metric has no EF entry (social/governance/non-carbon
 * metrics like headcount, water, incidents). The caller stores null in
 * MetricEntry.co2eKg for these — see agent_docs/calculations.md.
 */
export function calculateCO2e(
  rawValue: number,
  metricType: string,
  region: string,
): number | null {
  const ef = getEmissionFactor(metricType, region);
  if (ef === null) return null;
  return rawValue * ef;
}

export function kgToTonnes(kg: number): number {
  return kg / 1000;
}
