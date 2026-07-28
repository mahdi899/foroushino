import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

type RouteContext = { params: Promise<{ slug: string }> };

/**
 * Browser-facing product detail with the httpOnly student token attached.
 * Keeps marketing pages ISR-static while still hydrating ownership/pricing.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { slug } = await context.params;
  const token = (await cookies()).get(STUDENT_TOKEN_COOKIE)?.value;
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  const url = `${backend}/api/products/${encodeURIComponent(slug)}`;

  const headers: HeadersInit = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(url, { headers, cache: 'no-store' });
    const body = await res.text();
    return new NextResponse(body, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return NextResponse.json(
      { error: { code: 'upstream_unreachable', message_fa: 'ارتباط با سرور برقرار نشد.' } },
      { status: 502 },
    );
  }
}
