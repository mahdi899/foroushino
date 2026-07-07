import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';

const LOGIN_URLS = [
  SERVER_API_URL,
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
].filter((url, index, arr) => arr.indexOf(url) === index);

async function tryLogin(
  email: string,
  password: string,
  security?: {
    captcha_token?: unknown;
    captcha_id?: unknown;
    captcha_answer?: unknown;
    website?: unknown;
  },
) {
  let lastStatus = 500;
  let lastBody: unknown = null;

  for (const base of LOGIN_URLS) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/auth/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captcha_token: security?.captcha_token,
          captcha_id: security?.captcha_id,
          captcha_answer: security?.captcha_answer,
          website: security?.website,
        }),
        cache: 'no-store',
      });

      lastStatus = res.status;
      lastBody = await res.json().catch(() => null);

      if (res.ok) {
        return { ok: true as const, json: lastBody as { token?: string } };
      }
    } catch {
      continue;
    }
  }

  return { ok: false as const, status: lastStatus, body: lastBody };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? '').trim();
  const password = String(body.password ?? '');

  if (!email || !password) {
    return NextResponse.json({ error: 'ایمیل و رمز عبور را وارد کنید.' }, { status: 422 });
  }

  const result = await tryLogin(email, password, {
    captcha_token: body.captcha_token,
    captcha_id: body.captcha_id,
    captcha_answer: body.captcha_answer,
    website: body.website,
  });

  if (!result.ok) {
    const body = result.body;
    let backendMsg: string | null = null;

    if (body && typeof body === 'object') {
      const errors = (body as { errors?: Record<string, string[]> }).errors;
      if (errors?.captcha?.[0]) {
        backendMsg = errors.captcha[0];
      } else if (typeof (body as { message?: string }).message === 'string') {
        backendMsg = (body as { message?: string }).message ?? null;
      } else if (
        'error' in body &&
        body.error &&
        typeof body.error === 'object' &&
        'message_fa' in body.error
      ) {
        backendMsg = String((body.error as { message_fa?: string }).message_fa);
      }
    }

    return NextResponse.json(
      { error: backendMsg || 'ایمیل یا رمز عبور نادرست است.' },
      { status: result.status === 422 ? 422 : 401 },
    );
  }

  const token = result.json.token;
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
