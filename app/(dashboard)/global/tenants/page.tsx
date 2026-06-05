'use client';
import useSWR from 'swr';
import { Card, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ComplianceBadge } from '@/components/ui/ComplianceBadge';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RoleGuard } from '@/components/layout/RoleGuard';
import { formatNumber } from '@/lib/utils';

interface TenantRow {
  id: string;
  name: string;
  sectorProfile: 'FINANCIAL' | 'AGRICULTURE' | 'LEISURE';
  region: string;
  status: 'submitted' | 'late' | 'missing';
  recentTotalCo2eKg: number;
}

const fetcher = (url: string) =>
  fetch(url, { credentials: 'include' }).then((r) => {
    if (!r.ok) throw new Error('Failed');
    return r.json();
  });

export default function TenantsPage() {
  return (
    <RoleGuard allow={['CORPORATE_ANALYST', 'GLOBAL_ADMIN']}>
      <Inner />
    </RoleGuard>
  );
}

function Inner() {
  const { data, isLoading } = useSWR<{ tenants: TenantRow[] }>('/api/tenants', fetcher);
  if (isLoading) return <LoadingSpinner />;
  const tenants = data?.tenants ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-900">Tenant directory</h1>
        <p className="mt-1 text-sm text-ink-500">Submission compliance and recent emissions per subsidiary.</p>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase text-ink-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                <th className="px-4 py-3 text-left font-semibold">Sector</th>
                <th className="px-4 py-3 text-left font-semibold">Region</th>
                <th className="px-4 py-3 text-left font-semibold">Compliance</th>
                <th className="px-4 py-3 text-right font-semibold">Last 2 mo · tCO₂e</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                  <td className="px-4 py-3 font-medium text-ink-900">{t.name}</td>
                  <td className="px-4 py-3"><Badge tone="neutral">{t.sectorProfile}</Badge></td>
                  <td className="px-4 py-3 text-ink-700">{t.region}</td>
                  <td className="px-4 py-3"><ComplianceBadge status={t.status} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-ink-900">
                    {formatNumber(t.recentTotalCo2eKg / 1000)}
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
