import { NextResponse } from 'next/server';
import { SAT_TOKEN_COOKIE } from '@/lib/sat/session';
import { SERVER_API_URL } from '@/lib/api/config';

async function callSatAuth(path: string, body: Record<string, string>) {
  const bases = [
    SERVER_API_URL,
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  ].filter((url, i, arr) => arr.indexOf(url) === i);

  for (const base of bases) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return { ok: true as const, body: json, status: res.status };
      return { ok: false as const, body: json, status: res.status };
    } catch {
      continue;
    }
  }

  return { ok: false as const, body: null, status: 500 };
}

function extractError(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'error' in body) {
    const err = (body as { error?: { message_fa?: string } }).error;
    if (err?.message_fa) return err.message_fa;
  }
  return fallback;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mobile = String(body.mobile ?? '').trim();
  const code = String(body.code ?? '').trim();

  if (!mobile || !code) {
    return NextResponse.json({ error: 'شماره موبایل و کد تأیید را وارد کنید.' }, { status: 422 });
  }

  const result = await callSatAuth('/sat/auth/verify-otp', { mobile, code });

  if (!result.ok) {
    return NextResponse.json(
      { error: extractError(result.body, 'کد تأیید نامعتبر است.') },
      { status: result.status === 422 ? 422 : result.status === 403 ? 403 : 401 },
    );
  }

  const token = (result.body as { token?: string })?.token;
  if (!token) {
    return NextResponse.json({ error: 'ورود ناموفق بود.' }, { status: 401 });
  }

  const out = NextResponse.json({ ok: true });
  out.cookies.set(SAT_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return out;
}
