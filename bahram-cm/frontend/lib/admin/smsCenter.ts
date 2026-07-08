'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import type { SmsCenterConfig, SmsEventView, SmsGlobalView, SmsProviderView } from '@/lib/admin/smsCenter.types';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & { payload?: { error?: { message_fa?: string }; message?: string } };
  return { ok: false, error: err.payload?.error?.message_fa ?? err.payload?.message ?? fallback };
}

export async function loadSmsCenterConfig(): Promise<SmsCenterConfig | null> {
  try {
    const res = await adminFetch<{ data: SmsCenterConfig }>('/sms/center-config');
    return res.data;
  } catch {
    return null;
  }
}

export async function saveSmsGlobalSettings(input: Partial<SmsGlobalView>): Promise<{ ok: boolean; data?: SmsGlobalView; error?: string }> {
  try {
    const res = await adminFetch<{ data: SmsGlobalView }>('/sms/center-config/global', { method: 'PUT', body: input });
    revalidatePath('/admin/academy/sms');
    revalidatePath('/admin/settings');
    return { ok: true, data: res.data };
  } catch (e) {
    return actionError(e, 'ذخیره تنظیمات کلی پیامک ناموفق بود.');
  }
}

export async function saveSmsProvider(
  slug: string,
  input: { sender_number?: string; is_active?: boolean; credentials_input?: string },
): Promise<{ ok: boolean; data?: SmsProviderView; error?: string }> {
  try {
    const res = await adminFetch<{ data: SmsProviderView }>(`/sms/center-config/providers/${slug}`, { method: 'PUT', body: input });
    revalidatePath('/admin/academy/sms');
    revalidatePath('/admin/settings');
    return { ok: true, data: res.data };
  } catch (e) {
    return actionError(e, 'ذخیره پنل پیامکی ناموفق بود.');
  }
}

export async function testSmsProvider(slug: string): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await adminFetch<{ ok: boolean; message: string }>(`/sms/center-config/providers/${slug}/test`, { method: 'POST' });
    return { ok: res.ok, message: res.message };
  } catch (e) {
    return { ok: false, message: actionError(e, 'تست پنل پیامکی ناموفق بود.').error ?? 'خطا' };
  }
}

export async function saveSmsEvent(
  eventKey: string,
  input: {
    is_enabled?: boolean;
    message_template?: string;
    pattern_code?: string | null;
    use_pattern?: boolean;
    provider_slug?: string | null;
    fallback_enabled?: boolean;
    fallback_delay_seconds?: number | null;
  },
): Promise<{ ok: boolean; data?: SmsEventView; error?: string }> {
  try {
    const res = await adminFetch<{ data: SmsEventView }>(`/sms/center-config/events/${eventKey}`, { method: 'PUT', body: input });
    revalidatePath('/admin/academy/sms');
    return { ok: true, data: res.data };
  } catch (e) {
    return actionError(e, 'ذخیره تنظیمات رویداد ناموفق بود.');
  }
}
