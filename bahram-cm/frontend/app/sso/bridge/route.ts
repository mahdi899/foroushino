import { NextRequest, NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';

const STUDENT_TOKEN_COOKIE = 'bahram_student_token';

/**
 * Cross-domain SSO landing point — see `middleware.ts` (`redirectToFamilyDomain`
 * / `redirectToAppDomain`) for the domain that mints the bridge token, and
 * backend `SsoBridgeController` for the one-time exchange itself.
 *
 * `GET /sso/bridge?bt=<bridge_token>&next=/some/path`
 */
export async function GET(request: NextRequest) {
  const bridgeToken = request.nextUrl.searchParams.get('bt');
  const next = sanitizeNext(request.nextUrl.searchParams.get('next'));

  if (!bridgeToken) {
    return NextResponse.redirect(new URL(next, request.url));
  }

  try {
    const res = await fetch(`${SERVER_API_URL}/student/auth/sso/consume`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ bridge_token: bridgeToken }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    const json = (await res.json()) as { data?: { token?: string } };
    const token = json?.data?.token;
    if (!token) {
      return NextResponse.redirect(new URL(next, request.url));
    }

    const response = NextResponse.redirect(new URL(next, request.url));
    response.cookies.set(STUDENT_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.redirect(new URL(next, request.url));
  }
}

function sanitizeNext(next: string | null): string {
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/';
}
