/**
 * Tenant-scoped metric entries.
 *
 *   GET  → list this tenant's MetricEntry rows (default: current fiscal year).
 *   POST → submit a new MetricEntry. Server calculates CO2e from raw + EF map.
 *
 * Both go through withTenantContext() — RLS enforces that only the caller's
 * tenant rows are visible/insertable even if the application code has a bug.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, requireRole, UnauthorizedError } from '@/lib/auth';
import { withTenantContext, globalPrisma } from '@/lib/prisma';
import { calculateCO2e } from '@/lib/co2e';
import { startOfFiscalYearUTC, startOfMonthUTC } from '@/lib/utils';
import { presignEvidenceView } from '@/lib/s3';
import { requestLogger } from '@/lib/logger';

export async function GET(req: Request) {
  const log = requestLogger(req, { route: 'GET /api/metrics' });
  const start = Date.now();
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['SUBSIDIARY_OFFICER', 'CORPORATE_ANALYST', 'GLOBAL_ADMIN']);

    const url = new URL(req.url);
    const since = url.searchParams.get('since');
    const sinceDate = since ? new Date(since) : startOfFiscalYearUTC();

    log.debug('metrics list query', { tenantId: auth.tenantId, role: auth.role, since: sinceDate.toISOString() });

    const entries = await withTenantContext(auth.tenantId, (tx) =>
      tx.metricEntry.findMany({
        where: { reportingMonth: { gte: sinceDate } },
        include: { metricDefinition: true },
        orderBy: [{ reportingMonth: 'desc' }, { submittedAt: 'desc' }],
      }),
    );

    const dtos = await Promise.all(
      entries.map(async (e) => ({
        id: e.id,
        metricDefinitionId: e.metricDefinitionId,
        metricName: e.metricDefinition.name,
        metricType: e.metricDefinition.metricType,
        unit: e.unit,
        scope: e.metricDefinition.scope,
        rawValue: e.rawValue,
        co2eKg: e.co2eKg,
        reportingMonth: e.reportingMonth.toISOString(),
        evidenceUrl: e.evidenceUrl
          ? await presignEvidenceView(e.evidenceUrl, auth).catch(() => null)
          : null,
        submittedAt: e.submittedAt.toISOString(),
      })),
    );

    log.info('metrics list ok', { tenantId: auth.tenantId, count: dtos.length, durationMs: Date.now() - start });
    return NextResponse.json({ entries: dtos });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('metrics list failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const PostBody = z.object({
  metricDefinitionId: z.string().min(1),
  rawValue: z.number().finite().nonnegative(),
  reportingMonth: z.string().min(1), // ISO date — first-of-month enforced server-side
  evidenceUrl: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const log = requestLogger(req, { route: 'POST /api/metrics' });
  const start = Date.now();
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['SUBSIDIARY_OFFICER']);

    const json = await req.json().catch(() => null);
    const parsed = PostBody.safeParse(json);
    if (!parsed.success) {
      log.warn('metric submit: invalid body', { tenantId: auth.tenantId, issues: parsed.error.issues });
      return NextResponse.json({ error: 'Invalid body', issues: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    const [def, tenant] = await Promise.all([
      globalPrisma.metricDefinition.findUnique({ where: { id: body.metricDefinitionId } }),
      globalPrisma.tenant.findUnique({ where: { id: auth.tenantId }, select: { region: true, sectorProfile: true } }),
    ]);
    if (!def) {
      log.warn('metric submit: unknown definition', { tenantId: auth.tenantId, metricDefinitionId: body.metricDefinitionId });
      return NextResponse.json({ error: 'Unknown metric definition' }, { status: 404 });
    }
    if (!tenant) {
      log.error('metric submit: tenant not found', { tenantId: auth.tenantId });
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }
    if (def.sectorProfile !== tenant.sectorProfile) {
      log.warn('metric submit: sector mismatch', { tenantId: auth.tenantId, defSector: def.sectorProfile, tenantSector: tenant.sectorProfile });
      return NextResponse.json({ error: 'Metric not allowed for this sector' }, { status: 400 });
    }

    const reportingMonth = startOfMonthUTC(new Date(body.reportingMonth));
    if (Number.isNaN(reportingMonth.getTime())) {
      log.warn('metric submit: invalid reportingMonth', { tenantId: auth.tenantId, raw: body.reportingMonth });
      return NextResponse.json({ error: 'Invalid reportingMonth' }, { status: 400 });
    }

    const co2eKg = calculateCO2e(body.rawValue, def.metricType, tenant.region);

    const created = await withTenantContext(auth.tenantId, (tx) =>
      tx.metricEntry.create({
        data: {
          tenantId: auth.tenantId,
          metricDefinitionId: def.id,
          rawValue: body.rawValue,
          unit: def.unit,
          co2eKg,
          reportingMonth,
          evidenceUrl: body.evidenceUrl ?? null,
        },
      }),
    );

    log.info('metric submitted', {
      tenantId: auth.tenantId,
      entryId: created.id,
      metricType: def.metricType,
      rawValue: body.rawValue,
      co2eKg,
      reportingMonth: reportingMonth.toISOString(),
      durationMs: Date.now() - start,
    });
    return NextResponse.json({ entry: { id: created.id, co2eKg: created.co2eKg } }, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('metric submit failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
