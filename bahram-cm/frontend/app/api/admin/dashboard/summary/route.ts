import { NextResponse } from 'next/server';
import { adminFetch } from '@/lib/auth/session';
import { EMPTY_DASHBOARD_SUMMARY, type DashboardSummary } from '@/lib/admin/dashboardTypes';

/** Admin dashboard summary — isolated from public ISR / article / SEO caches. */
export async function GET() {
  try {
    const res = await adminFetch<{ data: DashboardSummary }>('/analytics/summary');
    return NextResponse.json({ data: res.data });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || 'اتصال به API برقرار نشد', data: EMPTY_DASHBOARD_SUMMARY },
      { status: err.status ?? 500 },
    );
  }
}
