import 'server-only';

import { adminFetch } from '@/lib/auth/session';
import type {
  PaginatedMeta,
  TelegramAccountView,
  TelegramBotView,
  TelegramBotProfileView,
  TelegramBotMessageView,
  TelegramBroadcastSegmentView,
  TelegramBroadcastView,
  TelegramDeliveryLogView,
  TelegramDestinationView,
  TelegramHealthSnapshot,
  TelegramOperatorView,
  TelegramRequiredChatView,
  TelegramStatsSummaryView,
  TelegramSupportCategoryView,
  TelegramUpdateLogView,
} from '@/lib/admin/telegram.types';

type ListQuery = Record<string, string | number | undefined>;

function buildQuery(query?: ListQuery): ListQuery | undefined {
  if (!query) return undefined;
  const clean: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== '') clean[k] = v;
  }
  return Object.keys(clean).length ? clean : undefined;
}

export async function loadTelegramHealth(): Promise<TelegramHealthSnapshot | null> {
  try {
    const res = await adminFetch<{ data: TelegramHealthSnapshot }>('/panel/telegram/health');
    return res.data;
  } catch {
    return null;
  }
}

export async function loadTelegramBots(): Promise<TelegramBotView[]> {
  try {
    const res = await adminFetch<{ data: TelegramBotView[] }>('/panel/telegram/bots');
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramBotProfile(botId: number): Promise<TelegramBotProfileView | null> {
  try {
    const res = await adminFetch<{ data: { telegram: TelegramBotProfileView } }>(`/panel/telegram/bots/${botId}/profile`, {
      timeoutMs: 30_000,
    });
    return res.data?.telegram ?? null;
  } catch {
    return null;
  }
}

export async function loadTelegramAccounts(query?: ListQuery): Promise<{ items: TelegramAccountView[]; meta: PaginatedMeta }> {
  try {
    const res = await adminFetch<{ data: TelegramAccountView[]; meta: PaginatedMeta }>('/panel/telegram/accounts', { query: buildQuery(query) });
    return { items: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 } };
  } catch {
    return { items: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  }
}

export async function loadTelegramRequiredChats(botKey?: string): Promise<TelegramRequiredChatView[]> {
  try {
    const res = await adminFetch<{ data: TelegramRequiredChatView[] }>('/panel/telegram/required-chats', { query: buildQuery({ bot_key: botKey }) });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramDestinations(botKey?: string): Promise<TelegramDestinationView[]> {
  try {
    const res = await adminFetch<{ data: TelegramDestinationView[] }>('/panel/telegram/destinations', { query: buildQuery({ bot_key: botKey }) });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramBroadcasts(query?: ListQuery): Promise<{ items: TelegramBroadcastView[]; meta: PaginatedMeta }> {
  try {
    const res = await adminFetch<{ data: TelegramBroadcastView[]; meta: PaginatedMeta }>('/panel/telegram/broadcasts', { query: buildQuery(query) });
    return { items: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 } };
  } catch {
    return { items: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  }
}

export async function loadTelegramBroadcastSegments(botKey?: string): Promise<TelegramBroadcastSegmentView[]> {
  try {
    const res = await adminFetch<{ data: TelegramBroadcastSegmentView[] }>('/panel/telegram/broadcast-segments', {
      query: buildQuery({ bot_key: botKey }),
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramStats(botKey?: string): Promise<TelegramStatsSummaryView | null> {
  try {
    const res = await adminFetch<{ data: TelegramStatsSummaryView }>('/panel/telegram/stats', {
      query: buildQuery({ bot_key: botKey }),
    });
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function loadTelegramMessages(botKey?: string): Promise<TelegramBotMessageView[]> {
  try {
    const res = await adminFetch<{ data: TelegramBotMessageView[] }>('/panel/telegram/messages', {
      query: buildQuery({ bot_key: botKey }),
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramSupportCategories(): Promise<TelegramSupportCategoryView[]> {
  try {
    const res = await adminFetch<{ data: TelegramSupportCategoryView[] }>('/panel/telegram/support/categories');
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramOperators(): Promise<TelegramOperatorView[]> {
  try {
    const res = await adminFetch<{ data: TelegramOperatorView[] }>('/panel/telegram/operators');
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function loadTelegramUpdates(query?: ListQuery): Promise<{ items: TelegramUpdateLogView[]; meta: PaginatedMeta }> {
  try {
    const res = await adminFetch<{ data: TelegramUpdateLogView[]; meta: PaginatedMeta }>('/panel/telegram/updates', { query: buildQuery(query) });
    return { items: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 } };
  } catch {
    return { items: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  }
}

export async function loadTelegramDeliveryLogs(query?: ListQuery): Promise<{ items: TelegramDeliveryLogView[]; meta: PaginatedMeta }> {
  try {
    const res = await adminFetch<{ data: TelegramDeliveryLogView[]; meta: PaginatedMeta }>('/panel/telegram/delivery-logs', { query: buildQuery(query) });
    return { items: res.data ?? [], meta: res.meta ?? { current_page: 1, last_page: 1, total: 0 } };
  } catch {
    return { items: [], meta: { current_page: 1, last_page: 1, total: 0 } };
  }
}
