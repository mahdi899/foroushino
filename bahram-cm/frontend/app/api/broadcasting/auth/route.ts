import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { backendProxyUrl } from '@/lib/backend-proxy';

const STUDENT_TOKEN_COOKIE = 'bahram_student_token';

/**
 * Proxy Laravel `/broadcasting/auth` with the httpOnly Sanctum token.
 * Echo cannot read the cookie; this route attaches Bearer for private channels.
 */
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(STUDENT_TOKEN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: 'Unauthenticated.' }, { status: 401 });
  }

  const body = await request.text();
  const backend = backendProxyUrl();

  let upstream: Response;
  try {
    upstream = await fetch(`${backend}/broadcasting/auth`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': request.headers.get('content-type') || 'application/x-www-form-urlencoded',
        Authorization: `Bearer ${token}`,
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return NextResponse.json({ message: 'Broadcast auth unavailable.' }, { status: 502 });
  }

  const text = await upstream.text();
  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
    },
  });
}
