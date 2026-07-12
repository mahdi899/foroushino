import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SAT_TOKEN_COOKIE } from '@/lib/sat/session';
import { SERVER_API_URL } from '@/lib/api/config';

async function satProxy(path: string, init?: RequestInit) {
  const jar = await cookies();
  const token = jar.get(SAT_TOKEN_COOKIE)?.value;
  const res = await fetch(`${SERVER_API_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });
  return { res, json: await res.json().catch(() => ({})) };
}

export async function GET() {
  const { res, json } = await satProxy('/sat/integration-tokens');
  const data = json.data ?? json;
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { res, json } = await satProxy('/sat/integration-tokens', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  const data = json.data ?? json;
  return NextResponse.json(data, { status: res.status });
}
