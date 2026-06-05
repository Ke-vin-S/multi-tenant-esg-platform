/**
 * Evidence storage.
 *
 * In production: real S3 via @aws-sdk/client-s3. Files go to AWS_S3_BUCKET,
 * keyed by `evidence/<tenantId>/<random>-<filename>`.
 *
 * In dev (DEV_S3_LOCAL=true and no AWS_S3_BUCKET): files are written to
 * ./tmp/evidence/<tenantId>/ and served back via /api/evidence/[...key].
 * Same return shape so the caller doesn't care which path ran.
 */
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const LOCAL_DIR = path.resolve(process.cwd(), 'tmp', 'evidence');

let cachedClient: S3Client | null = null;
function getClient(): S3Client {
  if (cachedClient) return cachedClient;
  cachedClient = new S3Client({
    region: process.env.AWS_S3_REGION ?? process.env.COGNITO_REGION ?? 'ap-southeast-1',
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });
  return cachedClient;
}

function isLocalFallback(): boolean {
  return process.env.DEV_S3_LOCAL === 'true' && !process.env.AWS_S3_BUCKET;
}

export interface UploadedEvidence {
  /** Stable identifier persisted in MetricEntry.evidenceUrl. For S3 this is the key; for local this is `local:<path>`. */
  evidenceUrl: string;
  /** Pre-signed (S3) or local download URL — for display only. */
  viewUrl: string;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120) || 'evidence';
}

function makeKey(tenantId: string, filename: string): string {
  const rand = randomBytes(8).toString('hex');
  return `evidence/${tenantId}/${rand}-${sanitizeFilename(filename)}`;
}

/**
 * Persist an uploaded file and return a stable identifier + viewing URL.
 * Caller is responsible for verifying auth & deriving tenantId from the JWT.
 */
export async function uploadEvidence(
  tenantId: string,
  filename: string,
  bytes: Uint8Array,
  contentType?: string,
): Promise<UploadedEvidence> {
  const key = makeKey(tenantId, filename);

  if (isLocalFallback()) {
    const fullPath = path.join(LOCAL_DIR, key.replace(/^evidence\//, ''));
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, bytes);
    return {
      evidenceUrl: `local:${key}`,
      viewUrl: `/api/evidence/${encodeURIComponent(key)}`,
    };
  }

  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error('AWS_S3_BUCKET not configured and DEV_S3_LOCAL not enabled');
  }
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
    }),
  );
  const viewUrl = await getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn: 3600 },
  );
  return { evidenceUrl: key, viewUrl };
}

/**
 * Resolve an evidenceUrl back to a stream-able payload. Used by /api/evidence/[key].
 * Returns null if the file does not exist.
 */
export async function readLocalEvidence(key: string): Promise<{ bytes: Buffer; size: number } | null> {
  if (!isLocalFallback()) return null;
  const fullPath = path.join(LOCAL_DIR, key.replace(/^evidence\//, ''));
  try {
    const st = await stat(fullPath);
    const bytes = await readFile(fullPath);
    return { bytes, size: st.size };
  } catch {
    return null;
  }
}

export async function presignEvidenceView(evidenceUrl: string): Promise<string> {
  if (evidenceUrl.startsWith('local:')) {
    const key = evidenceUrl.slice('local:'.length);
    return `/api/evidence/${encodeURIComponent(key)}`;
  }
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET not configured');
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: bucket, Key: evidenceUrl }),
    { expiresIn: 3600 },
  );
}
