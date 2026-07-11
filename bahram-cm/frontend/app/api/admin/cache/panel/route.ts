import { NextResponse } from 'next/server';
import { adminFetch, can, getCurrentUser } from '@/lib/auth/session';

async function proxyGet(path: string) {
  const res = await adminFetch<{ data: unknown }>(path);
  return NextResponse.json(res);
}

export async function GET() {
  const user = await getCurrentUser();
  if (!can(user, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const [statusRes, settingsRes] = await Promise.all([
      adminFetch<{ data: unknown }>('/panel/cache/status'),
      adminFetch<{ data: Record<string, unknown> }>('/panel/cache/settings'),
    ]);
    return NextResponse.json({ status: statusRes.data, settings: settingsRes.data });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || 'اتصال به API برقرار نشد', status: err.status ?? 500 },
      { status: err.status ?? 500 },
    );
  }
}
