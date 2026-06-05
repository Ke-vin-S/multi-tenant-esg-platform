import { describe, it, expect } from 'vitest';
import { formatNumber, formatTonnes, startOfMonthUTC, startOfFiscalYearUTC } from '@/lib/utils';

describe('formatNumber', () => {
  it('formats with default 2 decimals max', () => {
    expect(formatNumber(1234.567)).toBe('1,234.57');
  });
  it('trims trailing zeros', () => {
    expect(formatNumber(10)).toBe('10');
  });
});

describe('formatTonnes', () => {
  it('converts kg to tCO2e', () => {
    expect(formatTonnes(1500)).toBe('1.5 tCO₂e');
  });
});

describe('startOfMonthUTC', () => {
  it('returns the first-of-month UTC', () => {
    const d = new Date(Date.UTC(2026, 4, 17, 13, 45));
    const s = startOfMonthUTC(d);
    expect(s.getUTCFullYear()).toBe(2026);
    expect(s.getUTCMonth()).toBe(4);
    expect(s.getUTCDate()).toBe(1);
    expect(s.getUTCHours()).toBe(0);
  });
});

describe('startOfFiscalYearUTC', () => {
  it('returns Jan 1 UTC of the input year', () => {
    const s = startOfFiscalYearUTC(new Date(Date.UTC(2026, 6, 15)));
    expect(s.toISOString()).toBe('2026-01-01T00:00:00.000Z');
  });
});
