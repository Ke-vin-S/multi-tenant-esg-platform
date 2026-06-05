export function LoadingSpinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-ink-500 dark:text-ink-400" role="status" aria-label={label}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-600 dark:border-ink-700 dark:border-t-brand-400" />
      <span>{label}</span>
    </div>
  );
}

export function FullPageSpinner() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}
