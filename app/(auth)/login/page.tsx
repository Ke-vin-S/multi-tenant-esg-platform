'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

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

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSpinner label="Loading…" />}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next');
  const [users, setUsers] = useState<DemoUser[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/dev-login', { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 404) {
          setError('Dev login is disabled. Configure Cognito to sign in.');
          return;
        }
        const j = await r.json();
        setUsers(j.users);
      })
      .catch(() => setError('Failed to load demo users'));
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
      router.push(next || dashboardForRole(role));
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign-in failed');
    } finally {
      setBusyEmail(null);
    }
  }

  return (
    <Card className="space-y-5">
      <div className="text-center">
        <div className="text-brand-700 text-3xl">◉</div>
        <h1 className="mt-2 text-xl font-semibold text-ink-900">ESG Aggregation Platform</h1>
        <p className="mt-1 text-sm text-ink-500">Sign in as a demo persona to explore the PoC.</p>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {error}
        </div>
      )}

      {!users && !error && <LoadingSpinner label="Loading demo users…" />}

      {users && (
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.email}
              onClick={() => signIn(u.email, u.role)}
              disabled={busyEmail !== null}
              className="group flex w-full items-start justify-between rounded-lg border border-ink-200 bg-white p-3 text-left transition-colors hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 focus-ring"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-ink-900">{u.email}</div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <Badge tone={ROLE_TONE[u.role]}>{ROLE_LABEL[u.role]}</Badge>
                  <span className="text-xs text-ink-500">· {u.tenantName} · {u.sectorProfile}</span>
                </div>
              </div>
              {busyEmail === u.email && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600" />
              )}
            </button>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-ink-200 bg-ink-50 p-3 text-[11px] leading-relaxed text-ink-500">
        <strong className="text-ink-700">Dev mode.</strong> Cognito + S3 are not provisioned in this PoC build. Sessions are
        signed locally and evidence uploads are written to <code>./tmp/evidence/</code>. Disable <code>DEV_AUTH_BYPASS</code> for prod.
      </div>
    </Card>
  );
}
