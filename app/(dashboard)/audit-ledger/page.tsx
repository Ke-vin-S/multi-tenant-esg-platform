'use client';
import useSWR from 'swr';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber, monthLabel } from '@/lib/utils';
import { scopeShort } from '@/lib/scope-labels';
import type { MetricEntryDTO } from '@/types';

import { authFetcher } from '@/lib/fetcher';

export default function AuditLedgerPage() {
  const { data, isLoading } = useSWR<{ entries: MetricEntryDTO[] }>('/api/metrics', authFetcher);

  if (isLoading) return <LoadingSpinner />;
  const entries = data?.entries ?? [];

  if (entries.length === 0) {
    return <EmptyState title="No submissions yet" description="Once you submit metrics, they appear here for auditors." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">Audit ledger</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Every submitted MetricEntry for this tenant. Raw values are preserved alongside CO₂e for traceability.
        </p>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase text-ink-500 dark:border-ink-800 dark:bg-ink-900/60 dark:text-ink-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Month</th>
                <th className="px-4 py-3 text-left font-semibold">Metric</th>
                <th className="px-4 py-3 text-left font-semibold">Scope</th>
                <th className="px-4 py-3 text-right font-semibold">Raw value</th>
                <th className="px-4 py-3 text-right font-semibold">CO₂e (kg)</th>
                <th className="px-4 py-3 text-left font-semibold">Evidence</th>
                <th className="px-4 py-3 text-left font-semibold">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/40">
                  <td className="px-4 py-3 text-ink-700 dark:text-ink-200">{monthLabel(e.reportingMonth)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-ink-50">{e.metricName}</td>
                  <td className="px-4 py-3">
                    {e.scope
                      ? <Badge tone="neutral">{scopeShort(e.scope)}</Badge>
                      : <span className="text-xs text-ink-400 dark:text-ink-500">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-700 dark:text-ink-200">
                    {formatNumber(e.rawValue)} <span className="text-xs text-ink-400 dark:text-ink-500">{e.unit}</span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {e.co2eKg !== null ? (
                      <span className="text-ink-900 dark:text-ink-50">{formatNumber(e.co2eKg)}</span>
                    ) : (
                      <span className="text-xs text-ink-400 dark:text-ink-500">n/a</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.evidenceUrl ? (
                      <a
                        href={e.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand-700 hover:underline focus-ring dark:text-brand-300"
                      >
                        View
                      </a>
                    ) : (
                      <span className="text-xs text-ink-400 dark:text-ink-500">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-500 dark:text-ink-400">
                    {new Date(e.submittedAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
