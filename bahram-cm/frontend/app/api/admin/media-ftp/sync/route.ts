import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST(req: Request) {
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${SERVER_API_URL}/media/ftp/sync`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message_fa ?? json?.message ?? 'همگام‌سازی ناموفق بود.';
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json(json.data ?? json);
}
