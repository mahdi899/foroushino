import { NextResponse } from 'next/server';
import { SAT_TOKEN_COOKIE } from '@/lib/sat/session';
import { SERVER_API_URL } from '@/lib/api/config';
import { extractValidationMessage } from '@/lib/services/api';

const LOGIN_URLS = [
  SERVER_API_URL,
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
].filter((url, index, arr) => arr.indexOf(url) === index);

async function tryLogin(
  email: string,
  password: string,
  security?: {
    captcha_token?: unknown;
    captcha_provider?: unknown;
    captcha_id?: unknown;
    captcha_answer?: unknown;
    website?: unknown;
  },
) {
  let lastStatus = 500;
  let lastBody: unknown = null;

  for (const base of LOGIN_URLS) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/sat/auth/login`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          captcha_token: security?.captcha_token,
          captcha_provider: security?.captcha_provider,
          captcha_id: security?.captcha_id,
          captcha_answer: security?.captcha_answer,
          website: security?.website,
        }),
        cache: 'no-store',
      });

      lastStatus = res.status;
      lastBody = await res.json().catch(() => null);

      if (res.ok) {
        return { ok: true as const, json: lastBody as Record<string, unknown> };
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
    captcha_provider: body.captcha_provider,
    captcha_id: body.captcha_id,
    captcha_answer: body.captcha_answer,
    website: body.website,
  });

  if (!result.ok) {
    const payload = result.body;
    let backendMsg: string | null = null;

    if (payload && typeof payload === 'object') {
      const captchaMsg = extractValidationMessage(payload, 'captcha');
      if (captchaMsg) {
        backendMsg = captchaMsg;
      } else if (
        'error' in payload &&
        payload.error &&
        typeof payload.error === 'object' &&
        'message_fa' in payload.error
      ) {
        backendMsg = String((payload.error as { message_fa?: string }).message_fa);
      }
    }

    return NextResponse.json(
      { error: backendMsg || 'ایمیل یا رمز عبور نادرست است.' },
      { status: result.status === 422 ? 422 : result.status === 429 ? 429 : 401 },
    );
  }

  const json = result.json as Record<string, unknown>;
  const token = typeof json.token === 'string' ? json.token : undefined;
  const data = (json.data ?? {}) as {
    otp_required?: boolean;
    mobile?: string;
    mobile_masked?: string;
    expires_in?: number;
  };

  if (token && data.otp_required === false) {
    const out = NextResponse.json({ ok: true, otp_required: false });
    out.cookies.set(SAT_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return out;
  }

  if (!data.otp_required || !data.mobile) {
    return NextResponse.json({ error: 'ورود ناموفق بود.' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    otp_required: true,
    mobile: data.mobile,
    mobile_masked: data.mobile_masked ?? data.mobile,
    expires_in: data.expires_in ?? 120,
  });
}
