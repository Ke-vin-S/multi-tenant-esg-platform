import { cn } from '@/lib/utils';

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('card p-6', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-wide text-ink-500 uppercase dark:text-ink-400">{title}</h2>
        {subtitle && <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
