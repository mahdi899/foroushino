import { NextResponse } from 'next/server';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET?.trim() || '';

  try {
    const body = await request.json();
    const res = await fetch(`${SERVER_API_URL}/chatbot/verify-captcha`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(secret ? { 'X-Revalidate-Secret': secret } : {}),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
