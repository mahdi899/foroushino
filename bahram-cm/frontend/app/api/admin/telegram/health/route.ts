import { NextResponse } from 'next/server';
import { loadTelegramHealth } from '@/lib/admin/telegram';

export async function GET() {
  try {
    const data = await loadTelegramHealth();
    return NextResponse.json({ data });
  } catch (e) {
    const err = e as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || 'بارگذاری وضعیت ربات ناموفق بود', data: null },
      { status: err.status ?? 500 },
    );
  }
}
