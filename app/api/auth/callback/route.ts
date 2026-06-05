/**
 * Cognito Hosted-UI OAuth callback.
 *
 * Exchanges the `code` query param for tokens at the Cognito token endpoint,
 * stores the id_token as an httpOnly cookie, and redirects to /overview.
 *
 * Disabled (returns 501) if Cognito env vars are not configured — in that
 * case the app uses /api/auth/dev-login instead.
 */
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 });

  const domain = process.env.NEXT_PUBLIC_COGNITO_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!domain || !clientId) {
    return NextResponse.json(
      { error: 'Cognito not configured — use /api/auth/dev-login in local dev' },
      { status: 501 },
    );
  }

  const redirectUri = `${url.origin}/api/auth/callback`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
  });

  const tokenRes = await fetch(`https://${domain}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    return NextResponse.json({ error: 'Token exchange failed', detail: text }, { status: 502 });
  }

  const tokens = (await tokenRes.json()) as { id_token: string; expires_in: number };
  const res = NextResponse.redirect(new URL('/overview', url.origin));
  res.cookies.set('id_token', tokens.id_token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expires_in ?? 3600,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}
