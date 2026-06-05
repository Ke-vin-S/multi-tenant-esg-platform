'use client';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Role } from '@/types';

/**
 * Client-side role guard. Redundant with middleware + API checks — purpose is
 * to render an apologetic message instead of flashing forbidden content while
 * the redirect is in flight.
 */
export function RoleGuard({ allow, children }: { allow: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user || !allow.includes(user.role)) {
    return (
      <div className="card p-6 text-sm text-ink-500">
        You don&apos;t have access to this page.
      </div>
    );
  }
  return <>{children}</>;
}
