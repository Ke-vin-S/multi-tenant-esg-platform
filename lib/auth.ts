/**
 * Auth boundary for the PoC.
 *
 * In production: verify the Cognito ID-token JWT against the user pool's JWKS
 * and pull `custom:tenant_id` / `custom:role` from the claims.
 *
 * In local dev (DEV_AUTH_BYPASS=true): accept a signed local session cookie
 * minted by /api/auth/dev-login. The session payload carries the same
 * three fields, so downstream code is identical.
 *
 * NEVER trust client-supplied tenantId or role — both must come from a
 * verified token / signed session.
 */
import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { verifyDevSession, type DevSession } from './dev-session';

export type AuthRole = 'SUBSIDIARY_OFFICER' | 'CORPORATE_ANALYST' | 'GLOBAL_ADMIN';

export interface AuthContext {
  tenantId: string;
  role: AuthRole;
  cognitoSub: string;
  email?: string;
}

export class UnauthorizedError extends Error {
  constructor(msg = 'Unauthorized') {
    super(msg);
    this.name = 'UnauthorizedError';
  }
}

let cachedVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (cachedVerifier) return cachedVerifier;
  const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!userPoolId || !clientId) {
    throw new Error('Cognito env vars missing (NEXT_PUBLIC_COGNITO_USER_POOL_ID / NEXT_PUBLIC_COGNITO_CLIENT_ID)');
  }
  cachedVerifier = CognitoJwtVerifier.create({
    userPoolId,
    tokenUse: 'id',
    clientId,
  });
  return cachedVerifier;
}

/**
 * Verify a Cognito ID-token JWT against the pool JWKS.
 */
export async function verifyCognitoToken(token: string): Promise<AuthContext> {
  const verifier = getVerifier();
  const payload = await verifier.verify(token);
  const tenantId = payload['custom:tenant_id'];
  const role = payload['custom:role'];
  if (typeof tenantId !== 'string' || typeof role !== 'string') {
    throw new UnauthorizedError('Token missing required custom claims');
  }
  return {
    tenantId,
    role: role as AuthRole,
    cognitoSub: payload.sub,
    email: typeof payload.email === 'string' ? payload.email : undefined,
  };
}

function devBypassEnabled(): boolean {
  return process.env.DEV_AUTH_BYPASS === 'true';
}

function fromDevSession(s: DevSession): AuthContext {
  return {
    tenantId: s.tenantId,
    role: s.role as AuthRole,
    cognitoSub: s.sub,
    email: s.email,
  };
}

/**
 * Extract the auth context from a Next.js request.
 *
 * Resolution order:
 *   1. `Authorization: Bearer <id_token>` → Cognito verification (production path).
 *   2. `id_token` cookie → Cognito verification (web app path).
 *   3. `esg_dev_session` cookie → local signed-session verification (dev only).
 *
 * Throws UnauthorizedError on any failure — callers map to a 401.
 */
export async function requireAuth(req: Request): Promise<AuthContext> {
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookies = parseCookies(cookieHeader);

  const cognitoToken = bearer || cookies['id_token'];
  if (cognitoToken) {
    try {
      return await verifyCognitoToken(cognitoToken);
    } catch (err) {
      // Fall through to dev session in dev mode; in prod, fail closed.
      if (!devBypassEnabled()) {
        throw new UnauthorizedError('Invalid Cognito token');
      }
    }
  }

  if (devBypassEnabled()) {
    const devCookie = cookies['esg_dev_session'];
    if (devCookie) {
      const session = await verifyDevSession(devCookie);
      if (session) return fromDevSession(session);
    }
  }

  throw new UnauthorizedError();
}

export function requireRole(ctx: AuthContext, allowed: AuthRole[]): void {
  if (!allowed.includes(ctx.role)) {
    throw new UnauthorizedError(`Role ${ctx.role} not permitted`);
  }
}

export function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  }
  return out;
}
