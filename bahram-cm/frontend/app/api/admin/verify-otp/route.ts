import { NextResponse } from 'next/server';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { callAdminAuth, extractError } from '../authProxy';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mobile = String(body.mobile ?? '').trim();
  const code = String(body.code ?? '').trim();

  if (!mobile || !code) {
    return NextResponse.json({ error: 'شماره موبایل و کد تأیید را وارد کنید.' }, { status: 422 });
  }

  const result = await callAdminAuth('/auth/verify-otp', { mobile, code });

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
  out.cookies.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  return out;
}
