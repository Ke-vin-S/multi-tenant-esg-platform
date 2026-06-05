'use client';
import { useEffect, useState } from 'react';

/**
 * Tracks the OS-level prefers-color-scheme so non-CSS components
 * (e.g. Recharts SVG colors) can pick the right palette.
 *
 * Returns false during SSR — chart colors render in light initially and
 * swap to dark on mount. Acceptable since Recharts is client-only.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return isDark;
}

/**
 * Shared chart palette — keep colors here so all charts pick up theme
 * changes in lockstep.
 */
export function chartColors(isDark: boolean) {
  return {
    grid:        isDark ? '#1e293b' : '#e2e8f0',
    axisText:    isDark ? '#94a3b8' : '#64748b',
    tooltipBg:   isDark ? '#0f172a' : '#ffffff',
    tooltipText: isDark ? '#f1f5f9' : '#0f172a',
    tooltipBorder: isDark ? '#334155' : '#e2e8f0',
    line:        isDark ? '#22c55e' : '#16a34a',
    bar: {
      scope1:    isDark ? '#22c55e' : '#16a34a',
      scope2:    isDark ? '#38bdf8' : '#0ea5e9',
      scope3:    isDark ? '#a78bfa' : '#8b5cf6',
    },
    pie:         isDark
      ? ['#22c55e', '#38bdf8', '#fbbf24', '#a78bfa', '#f87171', '#2dd4bf']
      : ['#16a34a', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'],
  };
}
