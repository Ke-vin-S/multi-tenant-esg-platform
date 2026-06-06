'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading, error } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      window.location.href = `/login?next=${encodeURIComponent(pathname)}`;
    }
  }, [isLoading, error, user, pathname]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-950">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) return null; // redirecting — render nothing to avoid flash

  return <>{children}</>;
}
