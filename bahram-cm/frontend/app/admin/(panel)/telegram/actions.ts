'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, getToken } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & { payload?: { error?: { message_fa?: string }; message?: string } };
  return { ok: false, error: err.payload?.error?.message_fa ?? err.payload?.message ?? fallback };
}

function revalidateTelegram() {
  revalidatePath('/admin/telegram', 'layout');
}

export async function syncTelegramBotsAction(): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch('/panel/telegram/bots/sync', { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'همگام‌سازی ربات‌ها ناموفق بود.');
  }
}

export async function updateTelegramBotAction(
  botId: number,
  input: {
    is_active?: boolean;
    support_group_chat_id?: string | null;
    reports_chat_id?: string | null;
    reports_topic_id?: number | null;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/bots/${botId}`, { method: 'PATCH', body: input });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره تنظیمات ربات ناموفق بود.');
  }
}

export async function setTelegramWebhookAction(botId: number): Promise<{ ok: boolean; error?: string; url?: string }> {
  try {
    const res = await adminFetch<{ data: { ok: boolean; url: string } }>(`/panel/telegram/bots/${botId}/webhook/set`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true, url: res.data?.url };
  } catch (e) {
    return actionError(e, 'ثبت وب‌هوک ناموفق بود.');
  }
}

export async function unlinkTelegramAccountAction(accountId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/accounts/${accountId}/unlink`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'قطع اتصال حساب ناموفق بود.');
  }
}

export async function toggleTelegramAccountBlockAction(accountId: number, isBlocked: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/accounts/${accountId}`, { method: 'PATCH', body: { is_blocked: isBlocked } });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت کاربر ناموفق بود.');
  }
}

export async function toggleTelegramBotAdminAction(accountId: number, isBotAdmin: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/accounts/${accountId}/bot-admin`, { method: 'POST', body: { is_bot_admin: isBotAdmin } });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'تغییر نقش ادمین بات ناموفق بود.');
  }
}

export async function updateTelegramBotProfileAction(
  botId: number,
  input: {
    name?: string;
    description?: string;
    short_description?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/bots/${botId}/profile`, { method: 'PUT', body: input });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره پروفایل بات ناموفق بود.');
  }
}

export async function updateTelegramBotProfilePhotoAction(
  botId: number,
  formData: FormData,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/telegram/bots/${botId}/profile/photo`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      cache: 'no-store',
    });

    const payload = await res.json().catch(() => undefined);
    if (!res.ok) {
      const messageFa =
        payload && typeof payload === 'object' && 'error' in payload
          ? (payload as { error?: { message_fa?: string } }).error?.message_fa
          : undefined;
      const validationMessage =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : undefined;
      return { ok: false, error: messageFa ?? validationMessage ?? 'آپلود عکس پروفایل ناموفق بود.' };
    }

    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'آپلود عکس پروفایل ناموفق بود.');
  }
}

export async function removeTelegramBotProfilePhotoAction(botId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/bots/${botId}/profile/photo`, { method: 'DELETE' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف عکس پروفایل ناموفق بود.');
  }
}

export async function saveTelegramRequiredChatAction(
  input: {
    id?: number;
    bot_key: string;
    chat_id: string;
    title: string;
    invite_link?: string;
    is_required?: boolean;
    is_active?: boolean;
    sort_order?: number;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (input.id) {
      const { id, bot_key: _b, ...body } = input;
      await adminFetch(`/panel/telegram/required-chats/${id}`, { method: 'PATCH', body });
    } else {
      await adminFetch('/panel/telegram/required-chats', { method: 'POST', body: input });
    }
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره کانال اجباری ناموفق بود.');
  }
}

export async function deleteTelegramRequiredChatAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/required-chats/${id}`, { method: 'DELETE' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف کانال اجباری ناموفق بود.');
  }
}

export async function saveTelegramDestinationAction(
  input: {
    id?: number;
    bot_key: string;
    title: string;
    chat_id: string;
    username?: string;
    join_request_url?: string;
    is_active?: boolean;
  },
): Promise<{ ok: boolean; error?: string }> {
  try {
    if (input.id) {
      const { id, bot_key: _b, ...body } = input;
      await adminFetch(`/panel/telegram/destinations/${id}`, { method: 'PATCH', body });
    } else {
      await adminFetch('/panel/telegram/destinations', { method: 'POST', body: input });
    }
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره مقصد ناموفق بود.');
  }
}

export async function deleteTelegramDestinationAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/destinations/${id}`, { method: 'DELETE' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف مقصد ناموفق بود.');
  }
}

export async function saveTelegramBroadcastAction(input: {
  bot_key: string;
  title: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch('/panel/telegram/broadcasts', { method: 'POST', body: input });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ایجاد پیام همگانی ناموفق بود.');
  }
}

export async function approveTelegramBroadcastAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/broadcasts/${id}/approve`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'تأیید پیام همگانی ناموفق بود.');
  }
}

export async function dispatchTelegramBroadcastAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/broadcasts/${id}/dispatch`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'شروع ارسال همگانی ناموفق بود.');
  }
}

export async function sendTelegramBroadcastNowAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/broadcasts/${id}/send-now`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ارسال همگانی ناموفق بود.');
  }
}

export async function stopTelegramBroadcastAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/broadcasts/${id}/stop`, { method: 'POST' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'توقف پیام همگانی ناموفق بود.');
  }
}

export async function saveTelegramSupportCategoryAction(input: {
  id?: number;
  key: string;
  title_fa: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    if (input.id) {
      const { id, ...body } = input;
      await adminFetch(`/panel/telegram/support/categories/${id}`, { method: 'PATCH', body });
    } else {
      await adminFetch('/panel/telegram/support/categories', { method: 'POST', body: input });
    }
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره دسته پشتیبانی ناموفق بود.');
  }
}

export async function saveTelegramOperatorAction(input: {
  id?: number;
  telegram_user_id: number;
  admin_user_id?: number | null;
  display_name?: string;
  support_role?: string;
  is_active?: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    if (input.id) {
      const { id, telegram_user_id: _t, ...body } = input;
      await adminFetch(`/panel/telegram/operators/${id}`, { method: 'PATCH', body });
    } else {
      await adminFetch('/panel/telegram/operators', { method: 'POST', body: input });
    }
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره اپراتور ناموفق بود.');
  }
}

export async function deleteTelegramOperatorAction(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/panel/telegram/operators/${id}`, { method: 'DELETE' });
    revalidateTelegram();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف اپراتور ناموفق بود.');
  }
}

export async function retryFailedTelegramUpdatesAction(): Promise<{ ok: boolean; retried?: number; error?: string }> {
  try {
    const res = await adminFetch<{ data: { retried: number } }>('/panel/telegram/updates/retry-failed', { method: 'POST' });
    revalidateTelegram();
    return { ok: true, retried: res.data?.retried ?? 0 };
  } catch (e) {
    return actionError(e, 'تلاش مجدد آپدیت‌ها ناموفق بود.');
  }
}
