# Auth — AWS Cognito + Role-Gating

## Cognito Setup

User Pool with two custom attributes (set on the pool, not per-user):
- `custom:tenant_id` — set at user creation by Global Admin
- `custom:role` — one of `SUBSIDIARY_OFFICER`, `CORPORATE_ANALYST`, `GLOBAL_ADMIN`

These flow into the ID token as JWT claims and are the **only** source of truth for `tenantId` and `role` on the server.

## JWT Verification

Use `aws-jwt-verify` — do not decode JWTs manually or trust client-supplied `tenantId`.

```ts
// lib/auth.ts
import { CognitoJwtVerifier } from 'aws-jwt-verify';

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID!,
  tokenUse: 'id',
  clientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID!,
});

export type AuthContext = {
  tenantId: string;
  role: 'SUBSIDIARY_OFFICER' | 'CORPORATE_ANALYST' | 'GLOBAL_ADMIN';
  cognitoSub: string;
};

export async function verifyToken(token: string): Promise<AuthContext> {
  const payload = await verifier.verify(token);
  return {
    tenantId: payload['custom:tenant_id'] as string,
    role: payload['custom:role'] as AuthContext['role'],
    cognitoSub: payload.sub,
  };
}
```

## Extracting Auth in API Routes

```ts
// Standard pattern for every protected API route
import { verifyToken } from '@/lib/auth';

export async function POST(req: Request) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await verifyToken(token);
  // auth.tenantId and auth.role are now safe to use
}
```

## Middleware (Route Protection)

```ts
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const GLOBAL_ONLY_ROUTES = ['/global', '/admin'];

export async function middleware(req: NextRequest) {
  const token = req.cookies.get('id_token')?.value;
  if (!token) return NextResponse.redirect(new URL('/login', req.url));

  // Lightweight decode (not verify) for route gating — full verify happens in API routes
  const payload = JSON.parse(atob(token.split('.')[1]));
  const role = payload['custom:role'];

  if (GLOBAL_ONLY_ROUTES.some(r => req.nextUrl.pathname.startsWith(r))) {
    if (role !== 'CORPORATE_ANALYST' && role !== 'GLOBAL_ADMIN') {
      return NextResponse.redirect(new URL('/overview', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/(dashboard)/:path*', '/global/:path*', '/admin/:path*'],
};
```

## Client-Side Auth (Cognito Hosted UI or Amplify)

For the PoC, use Cognito's Hosted UI. After login:
1. Cognito redirects back with an authorization code
2. Exchange for tokens via Amplify or the Cognito token endpoint
3. Store `id_token` in an `httpOnly` cookie (set via a `/api/auth/callback` route)
4. Include `Authorization: Bearer <id_token>` in all API requests from the client

## Role-Based Routing

| Role | Dashboard Route | Can Access `/global`? | Can Access `/admin`? |
|---|---|---|---|
| `SUBSIDIARY_OFFICER` | `/overview` | ❌ | ❌ |
| `CORPORATE_ANALYST` | `/global` | ✅ | ❌ |
| `GLOBAL_ADMIN` | `/admin` | ✅ | ✅ |

## RLS Integration

The `tenantId` from the verified JWT is passed to the DB session variable in every tenant-scoped query. See @agent_docs/data-model.md for the `withTenantContext` pattern.

IMPORTANT: `CORPORATE_ANALYST` and `GLOBAL_ADMIN` must use `globalPrisma` (RLS bypass client). Do not use `withTenantContext` for these roles.
