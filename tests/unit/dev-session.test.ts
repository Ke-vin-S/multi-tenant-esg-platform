import { describe, it, expect } from 'vitest';
import { signDevSession, verifyDevSession } from '@/lib/dev-session';

describe('dev-session', () => {
  const fixture = {
    sub: 'dev-officer-browns',
    tenantId: 'tenant_xyz',
    role: 'SUBSIDIARY_OFFICER' as const,
    email: 'subsidiary_officer@test.com',
  };

  it('round-trips a valid signed payload', async () => {
    const cookie = await signDevSession(fixture);
    const verified = await verifyDevSession(cookie);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe(fixture.sub);
    expect(verified?.tenantId).toBe(fixture.tenantId);
    expect(verified?.role).toBe(fixture.role);
    expect(verified?.email).toBe(fixture.email);
    expect(verified?.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it('rejects a tampered payload', async () => {
    const cookie = await signDevSession(fixture);
    const [payload, mac] = cookie.split('.');
    const tampered = Buffer.from(JSON.stringify({ ...fixture, role: 'GLOBAL_ADMIN', iat: 0, exp: 9e9 }))
      .toString('base64url');
    expect(await verifyDevSession(`${tampered}.${mac}`)).toBeNull();
    expect(await verifyDevSession(`${payload}.deadbeef`)).toBeNull();
  });

  it('rejects an expired session', async () => {
    // ttl of -1 second ⇒ exp in the past
    const cookie = await signDevSession(fixture, -1);
    expect(await verifyDevSession(cookie)).toBeNull();
  });

  it('rejects malformed cookies', async () => {
    expect(await verifyDevSession('not-a-cookie')).toBeNull();
    expect(await verifyDevSession('')).toBeNull();
  });
});
