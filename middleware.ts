/**
 * Edge middleware — first line of route gating.
 *
 * 1. Redirect unauthenticated requests on dashboard routes to /login.
 * 2. Block subsidiary officers from /global and /admin.
 *
 * IMPORTANT: this is a UX layer, NOT the security boundary.
 * API routes still call requireAuth + requireRole, and RLS still filters at
 * the DB. A bug here cannot expose another tenant's data — see CLAUDE.md.
 *
 * We do NOT verify the token signature here (would require crypto in the
 * edge runtime). For the dev-bypass cookie we trust presence + base64-decode
 * the role; for the Cognito id_token we trust presence + decode the claim.
 * Both paths re-verify in the API route.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/overview', '/data-entry', '/audit-ledger', '/global', '/admin'];
const GLOBAL_ONLY = ['/global', '/admin'];
const ADMIN_ONLY = ['/admin'];

function decodeRole(req: NextRequest): string | null {
  const cognito = req.cookies.get('id_token')?.value;
  if (cognito) {
    try {
      const payload = JSON.parse(atob(cognito.split('.')[1]));
      return payload['custom:role'] ?? null;
    } catch {
      // fall through
    }
  }
  const dev = req.cookies.get('esg_dev_session')?.value;
  if (dev) {
    try {
      const dot = dev.indexOf('.');
      const payload = JSON.parse(atob(dev.slice(0, dot).replace(/-/g, '+').replace(/_/g, '/')));
      return payload.role ?? null;
    } catch {
      // fall through
    }
  }
  return null;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const hasSession =
    req.cookies.get('id_token')?.value || req.cookies.get('esg_dev_session')?.value;
  if (!hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const role = decodeRole(req);
  const isGlobalOnly = GLOBAL_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isAdminOnly = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isAdminOnly && role !== 'GLOBAL_ADMIN') {
    return NextResponse.redirect(new URL('/overview', req.url));
  }
  if (isGlobalOnly && role !== 'CORPORATE_ANALYST' && role !== 'GLOBAL_ADMIN') {
    return NextResponse.redirect(new URL('/overview', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/overview/:path*', '/data-entry/:path*', '/audit-ledger/:path*', '/global/:path*', '/admin/:path*'],
};
