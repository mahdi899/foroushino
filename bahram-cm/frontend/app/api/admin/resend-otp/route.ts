import { NextResponse } from 'next/server';
import { callAdminAuth, extractError } from '../authProxy';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mobile = String(body.mobile ?? '').trim();

  if (!mobile) {
    return NextResponse.json({ error: 'شماره موبایل نامعتبر است.' }, { status: 422 });
  }

  const result = await callAdminAuth('/auth/resend-otp', { mobile });

  if (!result.ok) {
    return NextResponse.json(
      { error: extractError(result.body, 'ارسال مجدد کد ناموفق بود.') },
      { status: result.status === 422 ? 422 : result.status === 429 ? 429 : result.status === 403 ? 403 : 401 },
    );
  }

  const data = (result.body as { data?: { expires_in?: number } })?.data;

  return NextResponse.json({
    ok: true,
    expires_in: data?.expires_in ?? 120,
  });
}
