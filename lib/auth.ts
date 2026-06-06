import { CognitoJwtVerifier } from 'aws-jwt-verify';
import logger from './logger';

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
  cachedVerifier = CognitoJwtVerifier.create({ userPoolId, tokenUse: 'id', clientId });
  return cachedVerifier;
}

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

export async function requireAuth(req: Request): Promise<AuthContext> {
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  const cookieHeader = req.headers.get('cookie') ?? '';
  const cookies = parseCookies(cookieHeader);

  const token = bearer || cookies['id_token'];
  if (!token) {
    logger.warn('auth: no token in request', { path: new URL(req.url).pathname });
    throw new UnauthorizedError();
  }

  try {
    return await verifyCognitoToken(token);
  } catch (err) {
    if (err instanceof UnauthorizedError) throw err;
    logger.warn('auth: invalid Cognito token', {
      path: new URL(req.url).pathname,
      error: err instanceof Error ? err.message : String(err),
    });
    throw new UnauthorizedError('Invalid Cognito token');
  }
}

export function requireRole(ctx: AuthContext, allowed: AuthRole[]): void {
  if (!allowed.includes(ctx.role)) {
    logger.warn('auth: role denied', { role: ctx.role, allowed, tenantId: ctx.tenantId });
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
