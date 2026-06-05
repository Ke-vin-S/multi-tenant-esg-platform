import { describe, it, expect } from 'vitest';
import { calculateCO2e, kgToTonnes } from '@/lib/co2e';

describe('calculateCO2e', () => {
  it('multiplies raw value by the regional EF', () => {
    // 1000 kWh * 0.55 kg/kWh = 550 kg CO2e in Sri Lanka
    expect(calculateCO2e(1000, 'env_electricity_purchased', 'LK')).toBeCloseTo(550, 6);
    // 100 L diesel * 2.68 kg/L = 268 kg
    expect(calculateCO2e(100, 'env_generator_fuel', 'LK')).toBeCloseTo(268, 6);
  });

  it('falls back to DEFAULT region when specific region missing', () => {
    expect(calculateCO2e(50, 'env_vehicle_fuel', 'TZ')).toBeCloseTo(50 * 2.31, 6);
  });

  it('returns null for non-carbon metric types', () => {
    expect(calculateCO2e(500, 'env_water_usage', 'LK')).toBeNull();
    expect(calculateCO2e(120, 'soc_headcount_total', 'KH')).toBeNull();
  });

  it('handles zero raw values', () => {
    expect(calculateCO2e(0, 'env_electricity_purchased', 'LK')).toBe(0);
  });
});

describe('kgToTonnes', () => {
  it('converts kg to metric tonnes', () => {
    expect(kgToTonnes(1500)).toBe(1.5);
    expect(kgToTonnes(0)).toBe(0);
  });
});
