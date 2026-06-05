'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { setPreference } from '@/lib/theme';

/**
 * Two-state theme toggle.
 *
 * Default (no localStorage entry) follows the OS. The icon always shows
 * the CURRENT theme — sun for light, moon for dark — and clicking flips
 * to the other. After the first click the preference becomes explicit
 * and is persisted in localStorage.
 *
 * The button observes the `dark` class on <html> so it stays in sync if
 * the theme changes from anywhere else (e.g. OS change while in default
 * 'system' mode).
 */
export function ThemeToggle({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const read = () => setIsDark(root.classList.contains('dark'));
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  function toggle() {
    setPreference(isDark ? 'light' : 'dark');
  }

  const nextLabel = isDark ? 'light' : 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      title={`Switch to ${nextLabel} mode`}
      aria-label={`Switch to ${nextLabel} mode`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 bg-white text-ink-700 transition-colors hover:bg-ink-50 focus-ring',
        'dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200 dark:hover:bg-ink-800',
        className,
      )}
    >
      {isDark ? <MoonIcon /> : <SunIcon />}
    </button>
  );
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
