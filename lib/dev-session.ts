/**
 * HMAC-signed local session for the DEV_AUTH_BYPASS flow.
 *
 * The cookie value is `<base64url(payload)>.<hex(hmac-sha256(payload, secret))>`.
 * Tampering with the payload changes the HMAC and verification fails.
 *
 * This exists ONLY to let the app run locally before Cognito is provisioned.
 * In production, DEV_AUTH_BYPASS must be unset and Cognito tokens are the
 * only accepted credential.
 */
import { webcrypto } from 'node:crypto';

export interface DevSession {
  sub: string;            // cognitoId of the seeded demo user
  tenantId: string;
  role: 'SUBSIDIARY_OFFICER' | 'CORPORATE_ANALYST' | 'GLOBAL_ADMIN';
  email: string;
  iat: number;            // issued-at, seconds
  exp: number;            // expires-at, seconds
}

const DEFAULT_TTL_SECONDS = 60 * 60 * 8; // 8 hours

function getSecret(): string {
  const s = process.env.DEV_SESSION_SECRET;
  if (!s) throw new Error('DEV_SESSION_SECRET not set');
  return s;
}

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

function b64urlDecode(s: string): Uint8Array {
  return Buffer.from(s, 'base64url');
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await webcrypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return Buffer.from(sig).toString('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDevSession(
  data: Omit<DevSession, 'iat' | 'exp'>,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const session: DevSession = { ...data, iat: now, exp: now + ttlSeconds };
  const payload = b64urlEncode(new TextEncoder().encode(JSON.stringify(session)));
  const mac = await hmac(payload, getSecret());
  return `${payload}.${mac}`;
}

export async function verifyDevSession(cookie: string): Promise<DevSession | null> {
  const dot = cookie.indexOf('.');
  if (dot === -1) return null;
  const payload = cookie.slice(0, dot);
  const mac = cookie.slice(dot + 1);
  let expected: string;
  try {
    expected = await hmac(payload, getSecret());
  } catch {
    return null;
  }
  if (!constantTimeEqual(mac, expected)) return null;

  let session: DevSession;
  try {
    session = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
  } catch {
    return null;
  }
  if (typeof session.exp !== 'number' || session.exp < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return session;
}

export const DEV_COOKIE_NAME = 'esg_dev_session';
