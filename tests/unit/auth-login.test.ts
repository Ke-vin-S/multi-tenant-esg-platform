import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSend = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn().mockImplementation(() => ({ send: mockSend })),
  InitiateAuthCommand: vi.fn((params) => params),
}));

import { POST } from '@/app/api/auth/login/route';

function makeReq(body: unknown) {
  return new Request('http://t/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function cognitoError(name: string) {
  return Object.assign(new Error(name), { name });
}

beforeEach(() => {
  mockSend.mockReset();
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = 'test-client-id';
  process.env.COGNITO_CLIENT_SECRET = 'test-secret';
  process.env.COGNITO_REGION = 'ap-south-1';
});

describe('POST /api/auth/login — validation', () => {
  it('returns 400 for empty body', async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeReq({ email: 'not-an-email', password: 'pass' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is missing', async () => {
    const res = await POST(makeReq({ email: 'user@test.com' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeReq({ password: 'pass' }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login — Cognito errors', () => {
  it('returns 401 with friendly message for NotAuthorizedException', async () => {
    mockSend.mockRejectedValueOnce(cognitoError('NotAuthorizedException'));
    const res = await POST(makeReq({ email: 'user@test.com', password: 'wrong' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid email or password');
  });

  it('returns 401 with friendly message for UserNotFoundException', async () => {
    mockSend.mockRejectedValueOnce(cognitoError('UserNotFoundException'));
    const res = await POST(makeReq({ email: 'ghost@test.com', password: 'pass' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Invalid email or password');
  });

  it('returns 401 with account-not-confirmed message for UserNotConfirmedException', async () => {
    mockSend.mockRejectedValueOnce(cognitoError('UserNotConfirmedException'));
    const res = await POST(makeReq({ email: 'user@test.com', password: 'pass' }));
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe('Account not confirmed');
  });

  it('returns 500 for unexpected Cognito errors', async () => {
    mockSend.mockRejectedValueOnce(cognitoError('InternalErrorException'));
    const res = await POST(makeReq({ email: 'user@test.com', password: 'pass' }));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/auth/login — success', () => {
  beforeEach(() => {
    mockSend.mockResolvedValue({
      AuthenticationResult: { IdToken: 'test-id-token', ExpiresIn: 3600 },
    });
  });

  it('returns 200 with ok:true', async () => {
    const res = await POST(makeReq({ email: 'user@test.com', password: 'SeedTest1!' }));
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
  });

  it('sets id_token as an httpOnly cookie', async () => {
    const res = await POST(makeReq({ email: 'user@test.com', password: 'SeedTest1!' }));
    const cookie = res.headers.get('set-cookie') ?? '';
    expect(cookie).toContain('id_token=test-id-token');
    expect(cookie.toLowerCase()).toContain('httponly');
  });

  it('sends USER_PASSWORD_AUTH flow to Cognito', async () => {
    await POST(makeReq({ email: 'user@test.com', password: 'SeedTest1!' }));
    const arg = mockSend.mock.calls[0][0];
    expect(arg.AuthFlow).toBe('USER_PASSWORD_AUTH');
    expect(arg.AuthParameters.USERNAME).toBe('user@test.com');
    expect(arg.AuthParameters.PASSWORD).toBe('SeedTest1!');
  });

  it('includes SECRET_HASH in auth parameters', async () => {
    await POST(makeReq({ email: 'user@test.com', password: 'SeedTest1!' }));
    const arg = mockSend.mock.calls[0][0];
    expect(typeof arg.AuthParameters.SECRET_HASH).toBe('string');
    expect(arg.AuthParameters.SECRET_HASH.length).toBeGreaterThan(0);
  });

  it('omits SECRET_HASH when no client secret is configured', async () => {
    delete process.env.COGNITO_CLIENT_SECRET;
    await POST(makeReq({ email: 'user@test.com', password: 'SeedTest1!' }));
    const arg = mockSend.mock.calls[0][0];
    expect(arg.AuthParameters.SECRET_HASH).toBeUndefined();
  });
});
