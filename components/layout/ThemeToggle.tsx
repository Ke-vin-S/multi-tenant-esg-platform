'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  applyTheme,
  readPreference,
  setPreference,
  type ThemePreference,
} from '@/lib/theme';

/**
 * Cycle button: System → Light → Dark → System …
 *
 * Shows the icon for the CURRENT preference, with the resolved icon as
 * a small dot if 'system'. Listens for OS theme changes when the
 * preference is 'system' so the page re-renders the icon accordingly.
 */
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];
const LABEL: Record<ThemePreference, string> = {
  system: 'System theme',
  light: 'Light theme',
  dark: 'Dark theme',
};

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePreference>('system');

  useEffect(() => {
    setPref(readPreference());

    // Re-render the icon when the OS theme changes (only matters in 'system' mode).
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (readPreference() === 'system') applyTheme('system');
      // trigger re-render
      setPref((p) => (p === 'system' ? 'system' : p));
    };
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);

  function cycle() {
    const next = ORDER[(ORDER.indexOf(pref) + 1) % ORDER.length];
    setPref(next);
    setPreference(next);
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Theme: ${LABEL[pref]} (click to switch)`}
      aria-label={`Switch theme — currently ${LABEL[pref]}`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50 focus-ring',
        'dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800',
        className,
      )}
    >
      <Icon pref={pref} />
    </button>
  );
}

function Icon({ pref }: { pref: ThemePreference }) {
  // 16x16 stroke-only SVGs so they inherit currentColor in both themes.
  if (pref === 'light') return <SunIcon />;
  if (pref === 'dark') return <MoonIcon />;
  return <SystemIcon />;
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}
