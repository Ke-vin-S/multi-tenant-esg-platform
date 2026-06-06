import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth';
import { globalPrisma } from '@/lib/prisma';
import { requestLogger } from '@/lib/logger';
import type { SectorProfile } from '@prisma/client';

const VALID_SECTORS = ['FINANCIAL', 'AGRICULTURE', 'LEISURE'] as const;

/**
 * GET /api/metrics/definitions?sector=<SectorProfile>
 *
 * Returns the metric definitions for the given sector. If `sector` is omitted,
 * defaults to the caller's tenant sector (subsidiary officer use-case).
 *
 * Definitions are global (not tenant-scoped) — safe to read with globalPrisma.
 */
export async function GET(req: Request) {
  const log = requestLogger(req, { route: 'GET /api/metrics/definitions' });
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const sectorParam = url.searchParams.get('sector');

    let sector: SectorProfile;
    if (sectorParam) {
      if (!VALID_SECTORS.includes(sectorParam as SectorProfile)) {
        log.warn('definitions: invalid sector', { tenantId: auth.tenantId, sector: sectorParam });
        return NextResponse.json({ error: 'Invalid sector' }, { status: 400 });
      }
      sector = sectorParam as SectorProfile;
    } else {
      const tenant = await globalPrisma.tenant.findUnique({
        where: { id: auth.tenantId },
        select: { sectorProfile: true },
      });
      if (!tenant) {
        log.error('definitions: tenant not found', { tenantId: auth.tenantId });
        return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
      }
      sector = tenant.sectorProfile;
    }

    log.debug('definitions query', { tenantId: auth.tenantId, sector });
    const definitions = await globalPrisma.metricDefinition.findMany({
      where: { sectorProfile: sector },
      orderBy: [{ scope: 'asc' }, { name: 'asc' }],
    });
    log.debug('definitions ok', { tenantId: auth.tenantId, sector, count: definitions.length });

    return NextResponse.json({ sector, definitions });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('definitions failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
