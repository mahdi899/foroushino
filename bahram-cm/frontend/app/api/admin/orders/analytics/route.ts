import { NextRequest, NextResponse } from 'next/server';
import { adminFetch } from '@/lib/auth/session';
import type { OrderAnalytics } from '@/lib/admin/commerceTypes';

export async function GET(request: NextRequest) {
  const days = request.nextUrl.searchParams.get('days') ?? '30';

  try {
    const res = await adminFetch<{ data: OrderAnalytics }>('/orders/analytics', {
      query: { days },
      timeoutMs: 60_000,
    });
    return NextResponse.json({ data: res.data });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || 'بارگذاری گزارش ناموفق بود.' },
      { status: err.status ?? 500 },
    );
  }
}
