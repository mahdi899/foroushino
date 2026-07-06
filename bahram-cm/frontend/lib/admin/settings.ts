'use server';

import { revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';

/**
 * Generic settings blob storage backed by the Laravel settings/{group} endpoint.
 * Each blob is stored as a single key inside a group so arbitrary JSON (theme
 * tokens, content-collection overrides) can be persisted without bespoke tables.
 */
export async function getSettingBlob<T = unknown>(group: string, key: string): Promise<T | null> {
  try {
    const res = await adminFetch<{ data: Record<string, T> }>(`/settings/${group}`);
    return (res.data?.[key] as T) ?? null;
  } catch {
    return null;
  }
}

function saveErrorMessage(err: unknown): string {
  const e = err as Error & { status?: number; payload?: { message?: string } };
  if (e.status === 401) return 'نشست منقضی شده — دوباره وارد شوید.';
  if (e.status === 403) return 'دسترسی ویرایش تنظیمات ندارید.';
  if (e.status === 422) return e.payload?.message ?? 'داده‌های ارسالی نامعتبر است.';
  if (e.status) return `خطای سرور (${e.status}). بک‌اند Laravel را بررسی کنید.`;
  return 'اتصال به سرور برقرار نشد. مطمئن شوید Laravel روی پورت ۸۰۰۰ در حال اجراست.';
}

export async function saveSettingBlob(
  group: string,
  key: string,
  value: unknown,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/settings/${group}`, { method: 'PUT', body: { values: { [key]: value } } });
    revalidateTag('settings', 'max');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: saveErrorMessage(err) };
  }
}
