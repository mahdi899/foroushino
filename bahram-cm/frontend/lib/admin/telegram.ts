import 'server-only';

import { adminFetch } from '@/lib/auth/session';
import type { TelegramHealthSnapshot } from '@/lib/admin/telegram.types';

export async function loadTelegramHealth(): Promise<TelegramHealthSnapshot | null> {
  try {
    const res = await adminFetch<{ data: TelegramHealthSnapshot }>('/panel/telegram/health');
    return res.data;
  } catch {
    return null;
  }
}
