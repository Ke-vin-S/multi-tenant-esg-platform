'use client';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { useAuth } from '@/hooks/useAuth';

const ROLE_TONE = {
  SUBSIDIARY_OFFICER: 'blue',
  CORPORATE_ANALYST: 'purple',
  GLOBAL_ADMIN:      'green',
} as const;

const ROLE_LABEL = {
  SUBSIDIARY_OFFICER: 'Officer',
  CORPORATE_ANALYST: 'Analyst',
  GLOBAL_ADMIN:      'Admin',
} as const;

export function Navbar() {
  const { user, isLoading } = useAuth();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    // Hard navigation so middleware sees the cleared cookie immediately.
    window.location.assign('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white px-6 dark:border-ink-800 dark:bg-ink-900">
      <div>
        {isLoading ? (
          <div className="h-4 w-40 animate-pulse rounded bg-ink-100 dark:bg-ink-800" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-900 dark:text-ink-50">{user.tenantName}</span>
            <Badge tone="neutral">{user.sectorProfile}</Badge>
            <Badge tone="neutral">{user.region}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        {user && (
          <>
            <div className="text-right text-xs">
              <div className="font-medium text-ink-900 dark:text-ink-50">{user.email}</div>
              <div className="text-ink-500 dark:text-ink-400">
                <Badge tone={ROLE_TONE[user.role]}>{ROLE_LABEL[user.role]}</Badge>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleLogout}>Sign out</Button>
          </>
        )}
      </div>
    </header>
  );
}
