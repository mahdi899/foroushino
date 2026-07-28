import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

/**
 * Browser-facing /me that attaches the httpOnly student token.
 * Used to hydrate marketing chrome without SSR cookie reads in root layout.
 */
export async function GET() {
  const token = (await cookies()).get(STUDENT_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ data: null }, { status: 200 });
  }

  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  try {
    const res = await fetch(`${backend}/api/v1/student/me`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({ data: null }, { status: 200 });
    }

    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json({ data: null }, { status: 200 });
  }
}
