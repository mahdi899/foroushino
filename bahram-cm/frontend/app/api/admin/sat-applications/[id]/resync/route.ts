import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_TOKEN_COOKIE } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;

  const res = await fetch(`${SERVER_API_URL}/sat-applications/${id}/resync`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  return NextResponse.json(await res.json().catch(() => ({})), { status: res.status });
}
