import { NextResponse } from 'next/server';
import { callAdminAuth, extractError } from '../authProxy';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mobile = String(body.mobile ?? '').trim();

  if (!mobile) {
    return NextResponse.json({ error: 'شماره موبایل را وارد کنید.' }, { status: 422 });
  }

  const result = await callAdminAuth('/auth/send-otp', {
    mobile,
    captcha_token: body.captcha_token,
    captcha_provider: body.captcha_provider,
    captcha_id: body.captcha_id,
    captcha_answer: body.captcha_answer,
    website: body.website,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: extractError(result.body, 'ارسال کد تأیید ناموفق بود.') },
      { status: result.status === 422 ? 422 : result.status === 429 ? 429 : result.status === 403 ? 403 : 401 },
    );
  }

  const data = (result.body as { data?: { mobile?: string; expires_in?: number } })?.data;

  return NextResponse.json({
    ok: true,
    mobile: data?.mobile ?? mobile,
    expires_in: data?.expires_in ?? 120,
  });
}
