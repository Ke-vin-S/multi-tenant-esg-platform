'use client';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
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
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-ink-200 bg-white px-6">
      <div>
        {isLoading ? (
          <div className="h-4 w-40 animate-pulse rounded bg-ink-100" />
        ) : user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-ink-900">{user.tenantName}</span>
            <Badge tone="neutral">{user.sectorProfile}</Badge>
            <Badge tone="neutral">{user.region}</Badge>
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        {user && (
          <>
            <div className="text-right text-xs">
              <div className="font-medium text-ink-900">{user.email}</div>
              <div className="text-ink-500">
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
