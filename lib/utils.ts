import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, opts: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, ...opts }).format(n);
}

export function formatTonnes(kg: number): string {
  return formatNumber(kg / 1000, { maximumFractionDigits: 2 }) + ' tCO₂e';
}

export function monthLabel(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

export function startOfMonthUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

export function startOfFiscalYearUTC(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
}
