import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth';
import { globalPrisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    // Look up the tenant name + sector for the UI shell.
    // globalPrisma is fine here — the lookup is by primary key, and the
    // viewer's tenant has already been authenticated.
    const tenant = await globalPrisma.tenant.findUnique({
      where: { id: auth.tenantId },
      select: { name: true, sectorProfile: true, region: true },
    });
    if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    return NextResponse.json({
      user: {
        email: auth.email,
        role: auth.role,
        tenantId: auth.tenantId,
        tenantName: tenant.name,
        sectorProfile: tenant.sectorProfile,
        region: tenant.region,
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    logger.error('auth/me failed', { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
