export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-12 text-center">
      <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-ink-500 dark:text-ink-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
