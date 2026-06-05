import { describe, it, expect } from 'vitest';
import { getEmissionFactor, EMISSION_FACTORS } from '@/lib/emission-factors';

describe('getEmissionFactor', () => {
  it('returns the exact region match when present', () => {
    expect(getEmissionFactor('env_electricity_purchased', 'LK')).toBe(0.55);
    expect(getEmissionFactor('env_electricity_purchased', 'MV')).toBe(0.72);
  });

  it('falls back to DEFAULT when the region is unknown', () => {
    expect(getEmissionFactor('env_electricity_purchased', 'ZZ')).toBe(
      EMISSION_FACTORS['env_electricity_purchased::DEFAULT'],
    );
    expect(getEmissionFactor('env_generator_fuel', 'LK')).toBe(2.68);
  });

  it('returns null for non-carbon metrics (no EF entry at all)', () => {
    expect(getEmissionFactor('env_water_usage', 'LK')).toBeNull();
    expect(getEmissionFactor('soc_headcount_total', 'KH')).toBeNull();
    expect(getEmissionFactor('gov_anticorruption_trained', 'LK')).toBeNull();
  });

  it('returns null for unknown metric types entirely', () => {
    expect(getEmissionFactor('completely_unknown_metric', 'LK')).toBeNull();
  });
});
