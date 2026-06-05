import { Badge } from '@/components/ui/Badge';
import { formatNumber } from '@/lib/utils';

export interface LeaderboardRow {
  id: string;
  name: string;
  sectorProfile: 'FINANCIAL' | 'AGRICULTURE' | 'LEISURE';
  totalCo2eKg: number;
}

export function SubsidiaryLeaderboard({ rows }: { rows: LeaderboardRow[] }) {
  const sorted = [...rows].sort((a, b) => b.totalCo2eKg - a.totalCo2eKg);
  const max = sorted[0]?.totalCo2eKg || 1;
  return (
    <ol className="space-y-2">
      {sorted.map((r, i) => {
        const tonnes = r.totalCo2eKg / 1000;
        const pct = (r.totalCo2eKg / max) * 100;
        return (
          <li key={r.id} className="flex items-center gap-4 rounded-lg p-3 hover:bg-ink-50">
            <span className="w-6 text-right text-sm font-semibold text-ink-400 tabular-nums">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-ink-900">{r.name}</span>
                <Badge tone="neutral">{r.sectorProfile}</Badge>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="w-32 text-right text-sm tabular-nums text-ink-900">
              {formatNumber(tonnes)} <span className="text-ink-500">tCO₂e</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
