'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, getToken } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';
import type { DatabaseBackupForm, DatabaseBackupView } from './databaseBackup.types';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & { payload?: { message?: string; errors?: Record<string, string[]> } };
  const firstFieldError = err.payload?.errors ? Object.values(err.payload.errors).flat()[0] : undefined;
  return { ok: false, error: firstFieldError ?? err.payload?.message ?? fallback };
}

export async function loadDatabaseBackupSettings(): Promise<DatabaseBackupView | null> {
  try {
    const res = await adminFetch<{ data: DatabaseBackupView }>('/panel/settings/database-backup');
    return res.data;
  } catch {
    return null;
  }
}

export async function saveDatabaseBackupSettingsAction(
  form: DatabaseBackupForm,
): Promise<{ ok: boolean; data?: DatabaseBackupView; error?: string }> {
  try {
    const res = await adminFetch<{ data: DatabaseBackupView }>('/panel/settings/database-backup', {
      method: 'PUT',
      body: {
        is_auto_enabled: form.isAutoEnabled,
        schedule_time: form.scheduleTime,
        send_to_telegram: form.sendToTelegram,
        retention_count: form.retentionCount,
      },
    });
    revalidatePath('/admin/settings');
    return { ok: true, data: res.data };
  } catch (e) {
    return actionError(e, 'ذخیره تنظیمات بکاپ ناموفق بود.');
  }
}

export async function runDatabaseBackupAction(
  sendToTelegram = true,
): Promise<{ ok: boolean; message: string; data?: DatabaseBackupView }> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/settings/database-backup/run`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ send_to_telegram: sendToTelegram }),
      cache: 'no-store',
      signal: AbortSignal.timeout(180_000),
    });

    const payload = await res.json().catch(() => undefined);
    const view = await loadDatabaseBackupSettings();
    revalidatePath('/admin/settings');

    if (!res.ok) {
      const message =
        payload && typeof payload === 'object' && 'data' in payload
          ? ((payload.data as { message?: string })?.message ?? 'اجرای بکاپ ناموفق بود.')
          : 'اجرای بکاپ ناموفق بود.';
      return { ok: false, message, data: view ?? undefined };
    }

    const data = payload && typeof payload === 'object' && 'data' in payload ? (payload.data as { ok: boolean; message: string }) : null;

    return { ok: data?.ok ?? true, message: data?.message ?? 'بکاپ انجام شد.', data: view ?? undefined };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'اجرای بکاپ ناموفق بود.' };
  }
}

export async function testDatabaseBackupTelegramAction(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await adminFetch<{ data: { ok: boolean; message: string } }>(
      '/panel/settings/database-backup/test-telegram',
      { method: 'POST' },
    );
    return res.data;
  } catch (e) {
    return { ok: false, message: actionError(e, 'تست تلگرام ناموفق بود.').error ?? 'خطا' };
  }
}

export async function exportDatabaseBackupAction(): Promise<
  { ok: true; blob: Uint8Array; filename: string } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/settings/database-backup/export`, {
      headers: {
        Accept: 'application/gzip',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(180_000),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => undefined);
      const message =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'خروجی گرفتن از دیتابیس ناموفق بود.';
      return { ok: false, error: message };
    }

    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] ?? `database-backup-${new Date().toISOString().slice(0, 10)}.sql.gz`;
    const buffer = await res.arrayBuffer();

    return { ok: true, blob: new Uint8Array(buffer), filename };
  } catch {
    return { ok: false, error: 'خروجی گرفتن از دیتابیس ناموفق بود.' };
  }
}

export async function exportMediaBackupAction(): Promise<
  { ok: true; blob: Uint8Array; filename: string } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/settings/database-backup/export/media`, {
      headers: {
        Accept: 'application/zip',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(600_000),
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => undefined);
      const message =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'خروجی گرفتن از media ناموفق بود.';
      return { ok: false, error: message };
    }

    const disposition = res.headers.get('content-disposition') ?? '';
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] ?? `media-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    const buffer = await res.arrayBuffer();

    return { ok: true, blob: new Uint8Array(buffer), filename };
  } catch {
    return { ok: false, error: 'خروجی گرفتن از media ناموفق بود.' };
  }
}

export async function uploadDownloadHostBackupAction(): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/settings/database-backup/upload-download-host`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(600_000),
    });

    const payload = await res.json().catch(() => undefined);

    if (!res.ok) {
      const message =
        payload && typeof payload === 'object' && 'data' in payload
          ? ((payload.data as { message?: string })?.message ?? 'آپلود بکاپ به هاست دانلود ناموفق بود.')
          : 'آپلود بکاپ به هاست دانلود ناموفق بود.';
      return { ok: false, message };
    }

    revalidatePath('/admin/settings');

    const data = payload && typeof payload === 'object' && 'data' in payload ? (payload.data as { message?: string }) : null;

    return { ok: true, message: data?.message ?? 'بکاپ روی هاست دانلود آپلود شد.' };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'آپلود بکاپ به هاست دانلود ناموفق بود.' };
  }
}

export async function importDatabaseBackupAction(
  formData: FormData,
): Promise<{ ok: boolean; message: string }> {
  try {
    const token = await getToken();
    const res = await fetch(`${SERVER_API_URL}/panel/settings/database-backup/import`, {
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
      const message =
        payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
          ? payload.message
          : 'بازیابی دیتابیس ناموفق بود.';
      return { ok: false, message };
    }

    revalidatePath('/admin/settings');

    return {
      ok: true,
      message:
        payload && typeof payload === 'object' && 'data' in payload
          ? ((payload.data as { message?: string })?.message ?? 'دیتابیس بازیابی شد.')
          : 'دیتابیس بازیابی شد.',
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : 'بازیابی دیتابیس ناموفق بود.' };
  }
}
