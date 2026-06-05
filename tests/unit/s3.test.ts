import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedError } from '@/lib/auth';
import type { AuthContext } from '@/lib/auth';

const mockGetSignedUrl = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrl,
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({})),
  PutObjectCommand: vi.fn((p) => p),
  GetObjectCommand: vi.fn((p) => p),
}));

import { presignEvidenceView } from '@/lib/s3';

const officer = (tenantId: string): AuthContext => ({
  tenantId, role: 'SUBSIDIARY_OFFICER', cognitoSub: 'sub-1',
});
const analyst = (): AuthContext => ({
  tenantId: 'tenant-a', role: 'CORPORATE_ANALYST', cognitoSub: 'sub-2',
});
const admin = (): AuthContext => ({
  tenantId: 'tenant-a', role: 'GLOBAL_ADMIN', cognitoSub: 'sub-3',
});

beforeEach(() => {
  mockGetSignedUrl.mockReset();
  delete process.env.AWS_S3_BUCKET;
});

describe('presignEvidenceView — ownership', () => {
  it('throws UnauthorizedError when SUBSIDIARY_OFFICER requests another tenant\'s evidence', async () => {
    await expect(
      presignEvidenceView('local:evidence/tenant-b/file.pdf', officer('tenant-a')),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('allows SUBSIDIARY_OFFICER to view their own tenant\'s evidence', async () => {
    const result = await presignEvidenceView('local:evidence/tenant-a/file.pdf', officer('tenant-a'));
    expect(result).toContain('/api/evidence/');
  });

  it('allows CORPORATE_ANALYST to view any tenant\'s evidence', async () => {
    const result = await presignEvidenceView('local:evidence/tenant-b/file.pdf', analyst());
    expect(result).toContain('/api/evidence/');
  });

  it('allows GLOBAL_ADMIN to view any tenant\'s evidence', async () => {
    const result = await presignEvidenceView('local:evidence/tenant-c/file.pdf', admin());
    expect(result).toContain('/api/evidence/');
  });
});

describe('presignEvidenceView — local fallback', () => {
  it('returns the local API path for local: evidence', async () => {
    const result = await presignEvidenceView('local:evidence/tenant-a/doc.pdf', officer('tenant-a'));
    expect(result).toBe(`/api/evidence/${encodeURIComponent('evidence/tenant-a/doc.pdf')}`);
  });
});

describe('presignEvidenceView — S3', () => {
  beforeEach(() => {
    process.env.AWS_S3_BUCKET = 'test-bucket';
    mockGetSignedUrl.mockResolvedValue('https://s3.example.com/signed');
  });

  it('returns a pre-signed URL for S3 evidence', async () => {
    const result = await presignEvidenceView('evidence/tenant-a/doc.pdf', officer('tenant-a'));
    expect(result).toBe('https://s3.example.com/signed');
    expect(mockGetSignedUrl).toHaveBeenCalledOnce();
  });

  it('throws UnauthorizedError for SUBSIDIARY_OFFICER on another tenant\'s S3 key', async () => {
    await expect(
      presignEvidenceView('evidence/tenant-b/doc.pdf', officer('tenant-a')),
    ).rejects.toThrow(UnauthorizedError);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it('throws when AWS_S3_BUCKET is not configured', async () => {
    delete process.env.AWS_S3_BUCKET;
    await expect(
      presignEvidenceView('evidence/tenant-a/doc.pdf', officer('tenant-a')),
    ).rejects.toThrow('AWS_S3_BUCKET not configured');
  });
});

describe('presignEvidenceView — malformed keys', () => {
  it('throws for a key with no tenant segment', async () => {
    await expect(
      presignEvidenceView('local:badkey', officer('tenant-a')),
    ).rejects.toThrow('Malformed evidence key');
  });

  it('throws for an S3 key with no tenant segment', async () => {
    process.env.AWS_S3_BUCKET = 'test-bucket';
    await expect(
      presignEvidenceView('badkey', officer('tenant-a')),
    ).rejects.toThrow('Malformed evidence key');
  });
});
