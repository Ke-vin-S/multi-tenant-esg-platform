'use client';
import { useEffect } from 'react';
import { readPreference, applyTheme } from '@/lib/theme';

/**
 * Mounts once in the root layout. Subscribes to the OS prefers-color-scheme
 * media query and re-applies the theme whenever it changes — but only when
 * the user hasn't pinned an explicit light/dark preference in localStorage.
 * Works alongside the inline THEME_INIT_SCRIPT which handles the initial paint.
 */
export function ThemeSync() {
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    function onSystemChange() {
      if (readPreference() === 'system') applyTheme('system');
    }
    mq.addEventListener('change', onSystemChange);
    return () => mq.removeEventListener('change', onSystemChange);
  }, []);
  return null;
}
