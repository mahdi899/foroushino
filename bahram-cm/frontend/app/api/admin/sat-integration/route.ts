import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

async function proxy(path: string, init?: RequestInit) {
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;

  const res = await fetch(`${SERVER_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  return { res, json };
}

export async function GET() {
  const { res, json } = await proxy('/sat-integration');
  return NextResponse.json(json, { status: res.status });
}

export async function PATCH(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { res, json } = await proxy('/sat-integration', { method: 'PATCH', body: JSON.stringify(body) });
  return NextResponse.json(json, { status: res.status });
}
