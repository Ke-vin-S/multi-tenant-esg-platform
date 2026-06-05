'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

function readNext(): string {
  if (typeof window === 'undefined') return '/overview';
  return new URLSearchParams(window.location.search).get('next') ?? '/overview';
}

function validateFields(email: string, password: string): { email?: string; password?: string } {
  const errs: { email?: string; password?: string } = {};
  if (!email) {
    errs.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errs.email = 'Enter a valid email address';
  }
  if (!password) {
    errs.password = 'Password is required';
  }
  return errs;
}

export default function LoginPage() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);

    const errs = validateFields(email, password);
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setServerError(j.error ?? 'Sign in failed');
        return;
      }

      window.location.assign(readNext());
    } catch {
      setServerError('Network error — please try again');
    } finally {
      setLoading(false);
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
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Sign in to continue.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            disabled={loading}
            placeholder="you@example.com"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 placeholder-ink-400',
              'disabled:opacity-50',
              fieldErrors.email
                ? 'border-red-400 focus:border-red-500 dark:border-red-500'
                : 'border-ink-300 focus:border-brand-500 dark:border-ink-600 dark:focus:border-brand-400',
            ].join(' ')}
          />
          {fieldErrors.email && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            disabled={loading}
            placeholder="••••••••"
            className={[
              'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors',
              'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 placeholder-ink-400',
              'disabled:opacity-50',
              fieldErrors.password
                ? 'border-red-400 focus:border-red-500 dark:border-red-500'
                : 'border-ink-300 focus:border-brand-500 dark:border-ink-600 dark:focus:border-brand-400',
            ].join(' ')}
          />
          {fieldErrors.password && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{fieldErrors.password}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200">
            {serverError}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-ring disabled:opacity-60 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Signing in…
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </Card>
  );
}
