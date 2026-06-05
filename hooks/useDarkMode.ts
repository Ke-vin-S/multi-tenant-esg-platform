'use client';
import { useEffect, useState } from 'react';

/**
 * Tracks whether the `dark` class is currently set on <html>, so non-CSS
 * components (Recharts SVG colors) can pick the right palette.
 *
 * We observe the class attribute instead of `prefers-color-scheme` because
 * the user can override OS preference via the ThemeToggle — and the source
 * of truth in either case is the `dark` class itself.
 */
export function useDarkMode(): boolean {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return isDark;
}

/** Shared chart palette — colors picked for legibility in each theme. */
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
