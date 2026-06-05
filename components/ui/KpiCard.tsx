import { cn } from '@/lib/utils';

export function KpiCard({
  label,
  value,
  unit,
  delta,
  trend = 'flat',
  className,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: string;
  trend?: 'up' | 'down' | 'flat';
  className?: string;
}) {
  const trendTone =
    trend === 'down'
      ? 'text-brand-700 bg-brand-50 dark:text-brand-300 dark:bg-brand-900/30'
      : trend === 'up'
        ? 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/30'
        : 'text-ink-500 bg-ink-100 dark:text-ink-400 dark:bg-ink-800';
  return (
    <div className={cn('card p-5', className)}>
      <div className="text-xs font-medium tracking-wide text-ink-500 uppercase dark:text-ink-400">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">{value}</span>
        {unit && <span className="text-sm text-ink-500 dark:text-ink-400">{unit}</span>}
      </div>
      {delta && (
        <div className="mt-2">
          <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium', trendTone)}>
            {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '–'} {delta}
          </span>
        </div>
      )}
    </div>
  );
}
