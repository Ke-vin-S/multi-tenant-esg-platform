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
import { globalPrisma } from '@/lib/prisma';
import { startOfMonthUTC } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['CORPORATE_ANALYST', 'GLOBAL_ADMIN']);

    const currentMonth = startOfMonthUTC(new Date());
    const previousMonth = new Date(Date.UTC(currentMonth.getUTCFullYear(), currentMonth.getUTCMonth() - 1, 1));

    const tenants = await globalPrisma.tenant.findMany({
      include: {
        metricEntries: {
          where: { reportingMonth: { gte: previousMonth } },
          select: { reportingMonth: true, co2eKg: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      tenants: tenants.map((t) => {
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

        return {
          id: t.id,
          name: t.name,
          sectorProfile: t.sectorProfile,
          region: t.region,
          status,
          recentTotalCo2eKg: totalCo2eKg,
        };
      }),
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
