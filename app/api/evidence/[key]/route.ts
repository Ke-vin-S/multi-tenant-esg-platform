/**
 * Local-fallback evidence viewer for DEV_S3_LOCAL mode.
 *
 * Verifies the caller is authenticated AND owns the tenant the file belongs to
 * (the tenantId is the second path segment of the evidence key).
 */
import { NextResponse } from 'next/server';
import { requireAuth, UnauthorizedError } from '@/lib/auth';
import { readLocalEvidence } from '@/lib/s3';

export async function GET(req: Request, { params }: { params: { key: string } }) {
  try {
    const auth = await requireAuth(req);
    const key = decodeURIComponent(params.key);

    // key shape: "evidence/<tenantId>/<filename>"
    const [, tenantInKey] = key.split('/');
    if (!tenantInKey) return NextResponse.json({ error: 'Bad key' }, { status: 400 });

    // Subsidiary officer can only view their own tenant's evidence;
    // analyst/admin can view any (they have legitimate cross-tenant access).
    if (auth.role === 'SUBSIDIARY_OFFICER' && tenantInKey !== auth.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await readLocalEvidence(key);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return new NextResponse(new Uint8Array(result.bytes), {
      status: 200,
      headers: {
        'Content-Type': key.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream',
        'Content-Length': String(result.size),
      },
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
