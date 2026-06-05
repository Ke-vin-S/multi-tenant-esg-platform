'use client';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmissionLineChart } from '@/components/charts/EmissionLineChart';
import { SubsidiaryLeaderboard } from '@/components/charts/SubsidiaryLeaderboard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { formatNumber } from '@/lib/utils';
import type { SectorProfile } from '@/types';

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Failed');
    return r.json();
  });

const VALID: SectorProfile[] = ['FINANCIAL', 'AGRICULTURE', 'LEISURE'];

export default function SectorPage() {
  const { profile } = useParams<{ profile: string }>();
  const sector = (profile || '').toUpperCase() as SectorProfile;

  return (
    <RoleGuard allow={['CORPORATE_ANALYST', 'GLOBAL_ADMIN']}>
      {VALID.includes(sector) ? <SectorInner sector={sector} /> : <p className="text-sm text-ink-500">Unknown sector.</p>}
    </RoleGuard>
  );
}

function SectorInner({ sector }: { sector: SectorProfile }) {
  const { data, isLoading } = useSWR<{
    totalCo2eKg: number;
    perTenant: Array<{ id: string; name: string; sectorProfile: SectorProfile; region: string; totalCo2eKg: number }>;
    perScope: Array<{ scope: string; totalCo2eKg: number }>;
    perMonth: Array<{ month: string; totalCo2eKg: number }>;
  }>(`/api/metrics/aggregate?sector=${sector}`, fetcher);

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const scope1 = data.perScope.find((s) => s.scope === 'SCOPE_1')?.totalCo2eKg ?? 0;
  const scope2 = data.perScope.find((s) => s.scope === 'SCOPE_2')?.totalCo2eKg ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">{sector} sector</h1>
        <p className="mt-1 text-sm text-ink-500">CO₂e across {data.perTenant.length} subsidiar{data.perTenant.length === 1 ? 'y' : 'ies'} · fiscal year to date.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Sector total" value={formatNumber(data.totalCo2eKg / 1000)} unit="tCO₂e" />
        <KpiCard label="Scope 1" value={formatNumber(scope1 / 1000)} unit="tCO₂e" />
        <KpiCard label="Scope 2" value={formatNumber(scope2 / 1000)} unit="tCO₂e" />
      </div>

      <Card>
        <CardHeader title="Emissions trend" subtitle={`${sector} · monthly tCO₂e`} />
        <EmissionLineChart data={data.perMonth} />
      </Card>

      <Card>
        <CardHeader title="Subsidiaries in sector" />
        <SubsidiaryLeaderboard rows={data.perTenant} />
      </Card>
    </div>
  );
}
