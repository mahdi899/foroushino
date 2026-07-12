import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const mobile = String(body.mobile ?? '').trim();

  if (!mobile) {
    return NextResponse.json({ error: 'شماره موبایل را وارد کنید.' }, { status: 422 });
  }

  const bases = [
    SERVER_API_URL,
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  ].filter((url, i, arr) => arr.indexOf(url) === i);

  for (const base of bases) {
    try {
      const res = await fetch(`${base.replace(/\/$/, '')}/sat/auth/resend-otp`, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
        cache: 'no-store',
      });
      const json = await res.json().catch(() => null);
      if (res.ok) return NextResponse.json({ ok: true, ...(json?.data ?? {}) });
      const msg =
        json?.error?.message_fa ?? 'ارسال مجدد کد ممکن نیست.';
      return NextResponse.json({ error: msg }, { status: res.status });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ error: 'خطا در ارتباط با سرور.' }, { status: 500 });
}
