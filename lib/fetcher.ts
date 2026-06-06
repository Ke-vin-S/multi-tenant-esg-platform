'use client';

/**
 * SWR fetcher for all dashboard API calls.
 * Redirects to /login on 401 so stale/expired sessions surface immediately
 * rather than leaving pages in a blank/empty state.
 */
export function authFetcher(url: string) {
  return fetch(url, { credentials: 'include' }).then(async (res) => {
    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
      }
      throw new Error('Unauthorized');
    }
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  });
}
