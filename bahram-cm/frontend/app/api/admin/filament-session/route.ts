import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';

function forwardSetCookies(from: Response, to: NextResponse) {
  const anyHeaders = from.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = anyHeaders.getSetCookie?.() ?? [];
  for (const cookie of setCookies) {
    to.headers.append('Set-Cookie', cookie);
  }
}

export async function POST() {
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }

  const res = await fetch(`${SERVER_API_URL}/auth/web-session`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Session bridge failed' }, { status: 401 });
  }

  const out = NextResponse.json({ ok: true });
  forwardSetCookies(res, out);
  return out;
}
