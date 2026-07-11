'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & {
    payload?: { error?: { message_fa?: string }; message?: string; errors?: Record<string, string[]> };
  };
  const field = err.payload?.errors ? Object.values(err.payload.errors)[0]?.[0] : undefined;
  return {
    ok: false,
    error: err.payload?.error?.message_fa ?? field ?? err.payload?.message ?? fallback,
  };
}

export async function revealStudentMobileAction(
  studentId: number,
): Promise<{ ok: true; mobile: string } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data: { mobile: string } }>(`/students/${studentId}/reveal-mobile`, {
      method: 'POST',
    });
    return { ok: true, mobile: res.data.mobile };
  } catch (e) {
    return actionError(e, 'نمایش شماره موبایل ناموفق بود.');
  }
}

export async function revealStudentNationalCodeAction(
  studentId: number,
): Promise<{ ok: true; national_code: string } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data: { national_code: string } }>(
      `/students/${studentId}/reveal-national-code`,
      { method: 'POST' },
    );
    return { ok: true, national_code: res.data.national_code };
  } catch (e) {
    return actionError(e, 'نمایش کد ملی ناموفق بود.');
  }
}

export async function reviewIdentityVerificationAction(
  id: number,
  input: {
    action: 'approve' | 'reject' | 'request_correction';
    reason_code?: string;
    reviewer_note?: string;
    correction_items?: string[];
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/identity-verifications/${id}`, {
      method: 'PATCH',
      body: input,
    });
    revalidatePath('/admin/academy/identity-verifications');
    revalidatePath(`/admin/academy/identity-verifications/${id}`);
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ثبت نتیجه بررسی ناموفق بود.');
  }
}

export async function updateIdentityProviderAction(
  slug: string,
  input: {
    is_enabled?: boolean;
    credentials?: Record<string, string>;
    settings?: Record<string, unknown>;
    label?: string;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/identity-providers/${slug}`, {
      method: 'PUT',
      body: input,
    });
    revalidatePath('/admin/settings/identity-providers');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره تنظیمات سرویس ناموفق بود.');
  }
}

export async function testIdentityProviderAction(
  slug: string,
): Promise<{ ok: true; message?: string } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data?: { message?: string }; message?: string }>(
      `/identity-providers/${slug}/test`,
      { method: 'POST' },
    );
    revalidatePath('/admin/settings/identity-providers');
    return { ok: true, message: res.data?.message ?? res.message ?? 'اتصال برقرار شد.' };
  } catch (e) {
    return actionError(e, 'تست اتصال ناموفق بود.');
  }
}

export async function updateIdentityRouteAction(
  id: number,
  input: {
    primary_provider: string;
    fallback_provider?: string | null;
    is_active?: boolean;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/identity-routes/${id}`, {
      method: 'PATCH',
      body: input,
    });
    revalidatePath('/admin/settings/identity-providers');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'ذخیره مسیر سرویس ناموفق بود.');
  }
}

export async function unlockOwnershipVerificationAction(
  studentId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/students/${studentId}/unlock-ownership`, { method: 'POST' });
    revalidatePath('/admin/academy/identity-verifications');
    return { ok: true };
  } catch (e) {
    return actionError(e, 'رفع قفل تطبیق شماره ناموفق بود.');
  }
}
