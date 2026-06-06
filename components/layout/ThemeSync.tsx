'use client';
import { useEffect, useLayoutEffect } from 'react';
import { readPreference, applyTheme } from '@/lib/theme';

// useLayoutEffect on the client fires after React commits but before the
// browser paints — perfect for fixing any theme mismatch without a flash.
// On the server (SSR pass) fall back to useEffect which is a no-op there.
const useSafeLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Mounts once in the root layout.
 * - On mount: re-applies the stored/system theme in case the inline script
 *   was overridden during React hydration.
 * - While mounted: listens for live OS preference changes and updates
 *   when no explicit preference is pinned in localStorage.
 */
export function ThemeSync() {
  useSafeLayoutEffect(() => {
    applyTheme(readPreference());
  }, []);

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
