import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST() {
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;

  const res = await fetch(`${SERVER_API_URL}/media/ftp/connection/test`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message_fa ?? json?.message ?? 'اتصال برقرار نشد.';
    return NextResponse.json({ error: msg }, { status: res.status });
  }

  return NextResponse.json(json.data ?? json);
}
