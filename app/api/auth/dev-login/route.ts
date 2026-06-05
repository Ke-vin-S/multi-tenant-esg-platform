/**
 * Dev-only login endpoint. Disabled unless DEV_AUTH_BYPASS=true.
 *
 * Body: { email: string }.
 * Looks up the seeded demo user by email, mints a signed dev session, and
 * sets it as an httpOnly cookie. This stands in for the Cognito Hosted UI
 * flow until the user pool is provisioned.
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { globalPrisma } from '@/lib/prisma';
import { signDevSession, DEV_COOKIE_NAME } from '@/lib/dev-session';

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Dev login disabled' }, { status: 404 });
  }
  let parsed;
  try {
    parsed = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  // globalPrisma is used because the user lookup is by email, not tenant-scoped.
  const user = await globalPrisma.user.findUnique({
    where: { email: parsed.email },
    include: { tenant: true },
  });
  if (!user) return NextResponse.json({ error: 'Unknown demo user' }, { status: 404 });

  const cookieValue = await signDevSession({
    sub: user.cognitoId,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
  });

  const res = NextResponse.json({
    user: {
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      sectorProfile: user.tenant.sectorProfile,
    },
  });
  res.cookies.set(DEV_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
    secure: process.env.NODE_ENV === 'production',
  });
  return res;
}

export async function GET() {
  // Surface the seeded demo users for the login UI to show as one-click buttons.
  if (process.env.DEV_AUTH_BYPASS !== 'true') {
    return NextResponse.json({ error: 'Dev login disabled' }, { status: 404 });
  }
  const users = await globalPrisma.user.findMany({
    include: { tenant: true },
    orderBy: [{ role: 'asc' }, { email: 'asc' }],
  });
  return NextResponse.json({
    users: users.map((u) => ({
      email: u.email,
      role: u.role,
      tenantName: u.tenant.name,
      sectorProfile: u.tenant.sectorProfile,
    })),
  });
}
