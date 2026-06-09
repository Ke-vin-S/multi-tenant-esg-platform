'use client';
import useSWR from 'swr';
import { Card, CardHeader } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { EmissionLineChart } from '@/components/charts/EmissionLineChart';
import { ResourceDonutChart } from '@/components/charts/ResourceDonutChart';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber, formatTonnes } from '@/lib/utils';
import { SCOPE_LABELS } from '@/lib/scope-labels';
import { useAuth } from '@/hooks/useAuth';
import type { MetricEntryDTO } from '@/types';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

import { authFetcher } from '@/lib/fetcher';

export default function OverviewPage() {
  const { user } = useAuth();
  const { data, isLoading } = useSWR<{ entries: MetricEntryDTO[] }>('/api/metrics', authFetcher);

  if (isLoading) return <LoadingSpinner />;
  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No data yet"
        description="Submit your first month of metrics to populate this dashboard."
        action={<Link href="/data-entry"><Button>Go to data entry</Button></Link>}
      />
    );
  }

  // KPIs over the loaded window (default: current fiscal year)
  const totalCo2eKg = entries.reduce((acc, e) => acc + (e.co2eKg ?? 0), 0);
  const scope1Kg = entries.filter((e) => e.scope === 'SCOPE_1').reduce((a, e) => a + (e.co2eKg ?? 0), 0);
  const scope2Kg = entries.filter((e) => e.scope === 'SCOPE_2').reduce((a, e) => a + (e.co2eKg ?? 0), 0);
  const distinctMetrics = new Set(entries.map((e) => e.metricType)).size;

  // 12-month trend, sum CO2e per reportingMonth
  const byMonth = new Map<string, number>();
  for (const e of entries) {
    if (e.co2eKg === null) continue;
    const key = e.reportingMonth.slice(0, 7);
    byMonth.set(key, (byMonth.get(key) ?? 0) + e.co2eKg);
  }
  const trend = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, kg]) => ({ month, totalCo2eKg: kg }));

  // Donut: emissions by metric name (only carbon)
  const byMetric = new Map<string, number>();
  for (const e of entries) {
    if (e.co2eKg === null) continue;
    byMetric.set(e.metricName, (byMetric.get(e.metricName) ?? 0) + e.co2eKg);
  }
  const donut = Array.from(byMetric.entries()).map(([name, value]) => ({ name, value }));

  // Non-carbon metrics block
  const nonCarbon = new Map<string, { unit: string; total: number }>();
  for (const e of entries) {
    if (e.co2eKg !== null) continue;
    const prev = nonCarbon.get(e.metricName);
    nonCarbon.set(e.metricName, {
      unit: e.unit,
      total: (prev?.total ?? 0) + e.rawValue,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">Subsidiary overview</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          {user?.tenantName} — fiscal year totals across all submitted metrics.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total CO₂e" value={formatNumber(totalCo2eKg / 1000)} unit="tCO₂e" />
        <KpiCard label="Scope 1" description={SCOPE_LABELS.SCOPE_1.description} value={formatNumber(scope1Kg / 1000)} unit="tCO₂e" />
        <KpiCard label="Scope 2" description={SCOPE_LABELS.SCOPE_2.description} value={formatNumber(scope2Kg / 1000)} unit="tCO₂e" />
        <KpiCard label="Metrics tracked" value={String(distinctMetrics)} unit="categories" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Emissions trend" subtitle="Monthly total · tCO₂e" />
          <EmissionLineChart data={trend} />
        </Card>
        <Card>
          <CardHeader title="By source" subtitle="Share of CO₂e" />
          {donut.length > 0 ? (
            <ResourceDonutChart data={donut} />
          ) : (
            <p className="text-sm text-ink-500 dark:text-ink-400">No carbon-bearing metrics submitted.</p>
          )}
        </Card>
      </div>

      {nonCarbon.size > 0 && (
        <Card>
          <CardHeader title="Resource & social metrics" subtitle="Non-carbon — tracked as raw totals over the period." />
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from(nonCarbon.entries()).map(([name, v]) => (
              <div key={name} className="rounded-lg border border-ink-200 p-4 dark:border-ink-800">
                <dt className="text-xs font-medium tracking-wide text-ink-500 uppercase dark:text-ink-400">{name}</dt>
                <dd className="mt-1 text-xl font-semibold tabular-nums text-ink-900 dark:text-ink-50">
                  {formatNumber(v.total)} <span className="text-sm font-normal text-ink-500 dark:text-ink-400">{v.unit}</span>
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      <div className="text-xs text-ink-400 dark:text-ink-500">
        Total in kilograms: {formatTonnes(totalCo2eKg)}
      </div>
    </div>
  );
}
