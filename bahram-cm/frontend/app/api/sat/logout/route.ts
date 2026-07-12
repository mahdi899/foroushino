import { NextResponse } from 'next/server';
import { SAT_TOKEN_COOKIE } from '@/lib/sat/session';

export async function POST() {
  const out = NextResponse.json({ ok: true });
  out.cookies.set(SAT_TOKEN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
  return out;
}
