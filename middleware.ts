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
 * Token signature is NOT verified here (edge runtime constraint).
 * Full verification happens in every API route via requireAuth.
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/overview', '/data-entry', '/audit-ledger', '/global', '/admin'];
const GLOBAL_ONLY = ['/global', '/admin'];
const ADMIN_ONLY = ['/admin'];

function decodeRole(req: NextRequest): string | null {
  const token = req.cookies.get('id_token')?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload['custom:role'] ?? null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (!PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  if (!req.cookies.get('id_token')?.value) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const role = decodeRole(req);
  const isAdminOnly = ADMIN_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));
  const isGlobalOnly = GLOBAL_ONLY.some((p) => pathname === p || pathname.startsWith(p + '/'));

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
