import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SAT_TOKEN_COOKIE } from '@/lib/sat/session';
import { SERVER_API_URL } from '@/lib/api/config';

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const jar = await cookies();
  const token = jar.get(SAT_TOKEN_COOKIE)?.value;

  const res = await fetch(`${SERVER_API_URL}/sat/integration-tokens/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: 'no-store',
  });

  return new NextResponse(null, { status: res.status });
}
