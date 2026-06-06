/**
 * Tenant directory.
 *
 *   GET → list all tenants with compliance summary. Analyst + Admin only.
 *
 * "Compliance" here = whether the tenant submitted a MetricEntry for the
 * current month. Drives the green/amber/red badge on /global/tenants.
 */
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, UnauthorizedError } from '@/lib/auth';
import { withGlobalContext } from '@/lib/prisma';
import { startOfMonthUTC } from '@/lib/utils';
import { requestLogger } from '@/lib/logger';

export async function GET(req: Request) {
  const log = requestLogger(req, { route: 'GET /api/tenants' });
  const start = Date.now();
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['CORPORATE_ANALYST', 'GLOBAL_ADMIN']);
    log.info('tenants list', { role: auth.role });

    const currentMonth = startOfMonthUTC(new Date());
    const previousMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1));

    const tenants = await withGlobalContext((tx) =>
      tx.tenant.findMany({
        include: {
          metricEntries: {
            where: { reportingMonth: { gte: previousMonth } },
            select: { reportingMonth: true, co2eKg: true },
          },
        },
        orderBy: { name: 'asc' },
      }),
    );

    const result = tenants.map((t) => {
      const submittedThisMonth = t.metricEntries.some(
        (e) => e.reportingMonth.getTime() === currentMonth.getTime(),
      );
      const submittedLastMonth = t.metricEntries.some(
        (e) => e.reportingMonth.getTime() === previousMonth.getTime(),
      );
      const status: 'submitted' | 'late' | 'missing' = submittedThisMonth
        ? 'submitted'
        : submittedLastMonth
          ? 'late'
          : 'missing';
      const totalCo2eKg = t.metricEntries.reduce((acc, e) => acc + (e.co2eKg ?? 0), 0);
      return { id: t.id, name: t.name, sectorProfile: t.sectorProfile, region: t.region, status, recentTotalCo2eKg: totalCo2eKg };
    });

    log.info('tenants list ok', { role: auth.role, count: result.length, durationMs: Date.now() - start });
    return NextResponse.json({ tenants: result });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('tenants list failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
