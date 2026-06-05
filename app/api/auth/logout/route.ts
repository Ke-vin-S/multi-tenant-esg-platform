import { NextResponse } from 'next/server';
import { DEV_COOKIE_NAME } from '@/lib/dev-session';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(DEV_COOKIE_NAME);
  res.cookies.delete('id_token');
  return res;
}
