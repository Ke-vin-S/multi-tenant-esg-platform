'use client';
import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

interface DemoUser {
  email: string;
  role: 'SUBSIDIARY_OFFICER' | 'CORPORATE_ANALYST' | 'GLOBAL_ADMIN';
  tenantName: string;
  sectorProfile: 'FINANCIAL' | 'AGRICULTURE' | 'LEISURE';
}

const ROLE_TONE = {
  SUBSIDIARY_OFFICER: 'blue',
  CORPORATE_ANALYST: 'purple',
  GLOBAL_ADMIN:      'green',
} as const;

const ROLE_LABEL = {
  SUBSIDIARY_OFFICER: 'Subsidiary Officer',
  CORPORATE_ANALYST: 'Corporate Analyst',
  GLOBAL_ADMIN:      'Global Admin',
} as const;

function dashboardForRole(role: DemoUser['role']): string {
  if (role === 'GLOBAL_ADMIN' || role === 'CORPORATE_ANALYST') return '/global';
  return '/overview';
}

// Read ?next= without useSearchParams so we don't have to coordinate the
// Suspense boundary. Safe to call on the client only.
function readNext(): string | null {
  if (typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('next');
}

export default function LoginPage() {
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[login] hydrated — fetching demo users');
    fetch('/api/auth/dev-login', { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 404) {
          setError('Dev login is disabled. Configure Cognito to sign in.');
          return;
        }
        const j = await r.json();
        setUsers(j.users ?? []);
      })
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[login] failed to load demo users', e);
        setError('Failed to load demo users');
      });
  }, []);

  async function signIn(email: string, role: DemoUser['role']) {
    setBusyEmail(email);
    try {
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Sign-in failed');
      }
      // Hard navigation so middleware sees the just-set cookie immediately.
      window.location.assign(readNext() ?? dashboardForRole(role));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
      setBusyEmail(null);
    }
  }

  return (
    <Card className="relative space-y-5">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="text-center">
        <div className="text-brand-700 text-3xl dark:text-brand-300">◉</div>
        <h1 className="mt-2 text-xl font-semibold text-ink-900 dark:text-ink-50">ESG Aggregation Platform</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Sign in as a demo persona to explore the PoC.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          {error}
        </div>
      )}

      {users === null && !error && <LoadingSpinner label="Loading demo users…" />}

      {users && users.length === 0 && !error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
          No demo users found. Run <code>npm run db:seed</code> to populate them.
        </div>
      )}

      {users && users.length > 0 && (
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.email}
              onClick={() => signIn(u.email, u.role)}
              disabled={busyEmail !== null}
              className="group flex w-full items-start justify-between rounded-lg border border-ink-200 bg-white p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 focus-ring dark:border-ink-700 dark:bg-ink-900 dark:hover:border-brand-500 dark:hover:bg-brand-900/30"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink-900 dark:text-ink-50">{u.email}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  <span className="text-xs text-ink-500 dark:text-ink-400">· {u.tenantName} · {u.sectorProfile}</span>
                </div>
              </div>
              {busyEmail === u.email && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600 dark:border-ink-700 dark:border-t-brand-400" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500 dark:border-ink-800 dark:bg-ink-900/40 dark:text-ink-400">
        <strong className="text-ink-700 dark:text-ink-200">Dev mode.</strong> Cognito + S3 are not provisioned in this PoC build. Sessions are
        signed locally and evidence uploads are written to <code>./tmp/evidence/</code>. Disable <code>DEV_AUTH_BYPASS</code> for prod.
      </div>
    </Card>
  );
}
