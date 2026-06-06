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
import { requestLogger } from '@/lib/logger';

const MAX_BYTES = 10 * 1024 * 1024; // 10 MiB
const ALLOWED_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg']);

export async function POST(req: Request) {
  const log = requestLogger(req, { route: 'POST /api/evidence' });
  const start = Date.now();
  try {
    const auth = await requireAuth(req);
    requireRole(auth, ['SUBSIDIARY_OFFICER']);

    const formData = await req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      log.warn('upload rejected: missing file', { tenantId: auth.tenantId });
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      log.warn('upload rejected: file too large', { tenantId: auth.tenantId, sizeBytes: file.size });
      return NextResponse.json({ error: 'File exceeds 10 MiB' }, { status: 413 });
    }
    if (file.type && !ALLOWED_MIME.has(file.type)) {
      log.warn('upload rejected: unsupported type', { tenantId: auth.tenantId, contentType: file.type });
      return NextResponse.json({ error: `Unsupported type: ${file.type}` }, { status: 415 });
    }

    log.info('upload started', { tenantId: auth.tenantId, filename: file.name, sizeBytes: file.size });
    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await uploadEvidence(auth.tenantId, file.name, bytes, file.type);
    log.info('upload complete', { tenantId: auth.tenantId, evidenceUrl: result.evidenceUrl, durationMs: Date.now() - start });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    log.error('upload failed', { error: err instanceof Error ? err.message : String(err), durationMs: Date.now() - start });
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
