/**
 * POST → upload an evidence PDF/PNG for the current tenant.
 *
 * Returns { evidenceUrl } which the client stores in the data-entry form
 * and ships back as part of the MetricEntry payload.
 *
 * NOTE: tenantId comes from the verified session, never from the form.
 */
import { NextResponse } from 'next/server';
import { requireAuth, requireRole, UnauthorizedError } from '@/lib/auth';
import { uploadEvidence } from '@/lib/s3';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['SUBSIDIARY_OFFICER']);

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10 MiB' }, { status: 413 });
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await uploadEvidence(auth.tenantId, file.name, bytes, file.type);
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    throw err;
  }
}
