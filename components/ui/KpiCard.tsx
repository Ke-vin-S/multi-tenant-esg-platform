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
    trend === 'down' ? 'text-brand-700 bg-brand-50' : trend === 'up' ? 'text-red-700 bg-red-50' : 'text-ink-500 bg-ink-100';
  return (
    <div className={cn('card p-5', className)}>
      <div className="text-xs font-medium tracking-wide text-ink-500 uppercase">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums text-ink-900">{value}</span>
        {unit && <span className="text-sm text-ink-500">{unit}</span>}
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
