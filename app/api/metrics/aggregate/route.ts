/**
 * Cross-tenant aggregation for the corporate-analyst dashboard.
 * Uses globalPrisma (RLS bypass) — gated to CORPORATE_ANALYST / GLOBAL_ADMIN.
 *
 * Returns:
 *   - per-tenant totals (for leaderboard)
 *   - per-scope totals (for stacked bar)
 *   - per-sector totals (for sector bar)
 *   - 12-month CO2e trend across all tenants
 */
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, UnauthorizedError } from '@/lib/auth';
import { globalPrisma } from '@/lib/prisma';
import { startOfFiscalYearUTC } from '@/lib/utils';
import { requestLogger } from '@/lib/logger';
import type { SectorProfile, EmissionScope } from '@prisma/client';

export async function GET(req: Request) {
  const log = requestLogger(req, { route: 'GET /api/metrics/aggregate' });
  const start = Date.now();
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['CORPORATE_ANALYST', 'GLOBAL_ADMIN']);

    const url = new URL(req.url);
    const sectorParam = url.searchParams.get('sector') as SectorProfile | null;
    const since = url.searchParams.get('since');
    const sinceDate = since ? new Date(since) : startOfFiscalYearUTC();

    log.info('aggregate query', { role: auth.role, sector: sectorParam ?? 'all', since: sinceDate.toISOString() });

    const tenants = await globalPrisma.tenant.findMany({
      where: sectorParam ? { sectorProfile: sectorParam } : undefined,
      select: { id: true, name: true, sectorProfile: true, region: true },
      orderBy: { name: 'asc' },
    });
    const tenantIds = tenants.map((t) => t.id);

    // Pull only the joined columns we need; aggregation happens in JS so we
    // can fork per-scope / per-sector / per-tenant without three roundtrips.
    const entries = await globalPrisma.metricEntry.findMany({
      where: {
        tenantId: { in: tenantIds },
        reportingMonth: { gte: sinceDate },
        co2eKg: { not: null },
      },
      select: {
        tenantId: true,
        co2eKg: true,
        reportingMonth: true,
        metricDefinition: { select: { scope: true, sectorProfile: true } },
      },
    });

    const perTenant = new Map<string, number>();
    const perScope = new Map<EmissionScope | 'UNSCOPED', number>();
    const perSector = new Map<SectorProfile, number>();
    const perMonth = new Map<string, number>();

    for (const e of entries) {
      const kg = e.co2eKg ?? 0;
      perTenant.set(e.tenantId, (perTenant.get(e.tenantId) ?? 0) + kg);
      const scopeKey = e.metricDefinition.scope ?? 'UNSCOPED';
      perScope.set(scopeKey, (perScope.get(scopeKey) ?? 0) + kg);
      perSector.set(
        e.metricDefinition.sectorProfile,
        (perSector.get(e.metricDefinition.sectorProfile) ?? 0) + kg,
      );
      const monthKey = e.reportingMonth.toISOString().slice(0, 7); // YYYY-MM
      perMonth.set(monthKey, (perMonth.get(monthKey) ?? 0) + kg);
    }

    const tenantSummaries = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      sectorProfile: t.sectorProfile,
      region: t.region,
      totalCo2eKg: perTenant.get(t.id) ?? 0,
    }));

    const totalCo2eKg = tenantSummaries.reduce((acc, t) => acc + t.totalCo2eKg, 0);

    log.info('aggregate ok', {
      role: auth.role,
      tenantCount: tenantSummaries.length,
      entryCount: entries.length,
      totalCo2eKg,
      durationMs: Date.now() - start,
    });
    return NextResponse.json({
      totalCo2eKg,
      perTenant: tenantSummaries,
      perScope: Array.from(perScope.entries()).map(([scope, kg]) => ({ scope, totalCo2eKg: kg })),
      perSector: Array.from(perSector.entries()).map(([sector, kg]) => ({ sector, totalCo2eKg: kg })),
      perMonth: Array.from(perMonth.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, kg]) => ({ month, totalCo2eKg: kg })),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('aggregate failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
