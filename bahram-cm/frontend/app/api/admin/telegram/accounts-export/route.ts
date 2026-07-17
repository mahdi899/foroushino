import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

export async function GET(request: NextRequest) {
  const token = await getToken();
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = request.nextUrl.searchParams.get('days') ?? '7';
  const botKey = request.nextUrl.searchParams.get('bot_key') ?? '';
  const qs = new URLSearchParams({ days });
  if (botKey) qs.set('bot_key', botKey);

  const res = await fetch(`${SERVER_API_URL}/api/v1/panel/telegram/accounts/export?${qs}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'text/plain',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Export failed' }, { status: res.status });
  }

  const blob = await res.arrayBuffer();
  const filename = res.headers.get('content-disposition')?.match(/filename="?([^"]+)"?/)?.[1]
    ?? `telegram-users-${days}d.txt`;

  return new NextResponse(blob, {
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
