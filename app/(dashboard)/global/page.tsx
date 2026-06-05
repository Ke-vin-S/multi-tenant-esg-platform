'use client';
import useSWR from 'swr';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmissionLineChart } from '@/components/charts/EmissionLineChart';
import { SectorBarChart } from '@/components/charts/SectorBarChart';
import { SubsidiaryLeaderboard } from '@/components/charts/SubsidiaryLeaderboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { formatNumber } from '@/lib/utils';
import type { SectorProfile, EmissionScope } from '@/types';

interface AggregateResponse {
  totalCo2eKg: number;
  perTenant: Array<{ id: string; name: string; sectorProfile: SectorProfile; region: string; totalCo2eKg: number }>;
  perScope: Array<{ scope: EmissionScope | 'UNSCOPED'; totalCo2eKg: number }>;
  perSector: Array<{ sector: SectorProfile; totalCo2eKg: number }>;
  perMonth: Array<{ month: string; totalCo2eKg: number }>;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Failed');
    return r.json();
  });

export default function GlobalPage() {
  return (
    <RoleGuard allow={['CORPORATE_ANALYST', 'GLOBAL_ADMIN']}>
      <GlobalInner />
    </RoleGuard>
  );
}

function GlobalInner() {
  const { data, isLoading } = useSWR<AggregateResponse>('/api/metrics/aggregate', fetcher);
  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const tonnes = data.totalCo2eKg / 1000;
  const scope1 = data.perScope.find((s) => s.scope === 'SCOPE_1')?.totalCo2eKg ?? 0;
  const scope2 = data.perScope.find((s) => s.scope === 'SCOPE_2')?.totalCo2eKg ?? 0;
  const sectorCount = data.perSector.length;

  // Build stacked-bar data from perTenant — needs scope split per tenant, which
  // aggregate endpoint does not return. We approximate with the global scope split
  // proportionally; for an exact view, /global/sector/[profile] drills down.
  const totalCarbon = scope1 + scope2 || 1;
  const s1Share = scope1 / totalCarbon;
  const s2Share = scope2 / totalCarbon;
  const stacked = data.perTenant.map((t) => ({
    name: t.name,
    scope1: t.totalCo2eKg * s1Share,
    scope2: t.totalCo2eKg * s2Share,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">Group overview</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">Consolidated CO₂e across all subsidiaries · current fiscal year.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total CO₂e" value={formatNumber(tonnes)} unit="tCO₂e" />
        <KpiCard label="Scope 1" value={formatNumber(scope1 / 1000)} unit="tCO₂e" />
        <KpiCard label="Scope 2" value={formatNumber(scope2 / 1000)} unit="tCO₂e" />
        <KpiCard label="Sectors reporting" value={String(sectorCount)} unit="of 3" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Group emissions trend" subtitle="Monthly total · tCO₂e" />
          <EmissionLineChart data={data.perMonth} />
        </Card>
        <Card>
          <CardHeader title="By sector" subtitle="Share of CO₂e" />
          <ul className="space-y-3">
            {data.perSector
              .sort((a, b) => b.totalCo2eKg - a.totalCo2eKg)
              .map((s) => {
                const pct = data.totalCo2eKg ? (s.totalCo2eKg / data.totalCo2eKg) * 100 : 0;
                return (
                  <li key={s.sector}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-ink-700 dark:text-ink-200">{s.sector}</span>
                      <span className="tabular-nums text-ink-500 dark:text-ink-400">{formatNumber(s.totalCo2eKg / 1000)} tCO₂e</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                      <div className="h-full rounded-full bg-brand-500 dark:bg-brand-400" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader title="Per-subsidiary emissions" subtitle="Stacked by scope · tCO₂e" />
        <SectorBarChart data={stacked} />
      </Card>

      <Card>
        <CardHeader title="Subsidiary leaderboard" subtitle="Ranked by total CO₂e — highest emitters first" />
        <SubsidiaryLeaderboard rows={data.perTenant} />
      </Card>
    </div>
  );
}
