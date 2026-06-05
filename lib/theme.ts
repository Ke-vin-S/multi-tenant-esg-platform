/**
 * Theme controller for class-based dark mode.
 *
 * Stored value (localStorage key `theme`):
 *   - 'light'  → always light
 *   - 'dark'   → always dark
 *   - absent   → follow OS (prefers-color-scheme)
 *
 * Resolved class on <html> is just `dark` or absence-of-`dark`.
 *
 * The initial class is set synchronously by an inline <script> in
 * app/layout.tsx — so the page never flashes the wrong theme before
 * React hydrates.
 */

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

export function readPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function resolvedTheme(pref: ThemePreference): 'light' | 'dark' {
  if (pref === 'system') return prefersDark() ? 'dark' : 'light';
  return pref;
}

export function applyTheme(pref: ThemePreference) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolvedTheme(pref) === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function setPreference(pref: ThemePreference) {
  if (typeof window === 'undefined') return;
  if (pref === 'system') window.localStorage.removeItem(STORAGE_KEY);
  else window.localStorage.setItem(STORAGE_KEY, pref);
  applyTheme(pref);
}

/**
 * Inline initializer string. Embedded by app/layout.tsx into <head> so
 * the `dark` class is set BEFORE first paint, eliminating the FOUC.
 *
 * Kept tiny and self-contained — no module imports — so it runs as raw JS.
 */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var dark = stored === 'dark' || (stored !== 'light' && systemDark);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) { /* localStorage may throw in private mode — ignore */ }
})();
`;
