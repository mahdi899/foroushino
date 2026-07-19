'use server';

import { revalidatePath } from 'next/cache';
import { studentFetch } from '@/lib/student/session';
import { getStudentToken } from '@/lib/student/session';
import { SERVER_API_URL } from '@/lib/api/config';
import { resolveIdentityApiError, resolveIdentityApiErrorDetail } from '@/lib/student/identityVerificationErrors';

export interface SimpleFormState {
  error?: string;
  errorTitle?: string;
  success?: string;
  data?: Record<string, unknown>;
}

function identityActionError(err: unknown, fallback: string): Pick<SimpleFormState, 'error' | 'errorTitle'> {
  const detail = resolveIdentityApiErrorDetail(err, fallback);
  return { error: detail.message, errorTitle: detail.title };
}

async function studentUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getStudentToken();
  const url = `${SERVER_API_URL}/student${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = new Error(`Student API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }
  return (await res.json()) as T;
}

export async function getIdentityVerificationStateAction(): Promise<{
  ok: true;
  data: Record<string, unknown>;
} | { ok: false; error: string }> {
  try {
    const res = await studentFetch<{ data: Record<string, unknown> }>('/identity-verification');
    return { ok: true, data: res.data };
  } catch (err) {
    return { ok: false, error: resolveIdentityApiError(err, 'دریافت وضعیت تأیید هویت ناموفق بود.') };
  }
}

export async function fetchVideoPromptAction(): Promise<
  { ok: true; text: string } | { ok: false; error: string }
> {
  try {
    const res = await studentFetch<{ data: { text?: string; prompt?: string } }>(
      '/identity-verification/video-prompt',
    );
    const text = res.data.text ?? res.data.prompt ?? '';
    if (!text) return { ok: false, error: 'متن ویدیو دریافت نشد.' };
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: resolveIdentityApiError(err, 'دریافت متن ویدیو ناموفق بود.') };
  }
}

export async function saveIdentityDraftAction(
  _prev: SimpleFormState,
  formData: FormData,
): Promise<SimpleFormState> {
  const payload = {
    first_name: String(formData.get('first_name') ?? '').trim(),
    last_name: String(formData.get('last_name') ?? '').trim(),
    national_code: String(formData.get('national_code') ?? '').replace(/\D/g, ''),
    date_of_birth: String(formData.get('date_of_birth') ?? ''),
    gender: String(formData.get('gender') ?? ''),
    city: String(formData.get('city') ?? '').trim(),
  };

  try {
    const res = await studentFetch<{ data: { id?: number } }>('/identity-verification/draft', { method: 'POST', body: payload });
    const submissionId = res.data?.id;
    revalidatePath('/panel/identity-verification');
    revalidatePath('/panel/profile');
    return {
      success: 'اطلاعات هویتی ذخیره شد.',
      data: { ...payload, ...(submissionId ? { draft_submission_id: submissionId } : {}) },
    };
  } catch (err) {
    return identityActionError(err, 'ذخیره اطلاعات هویتی ناموفق بود.');
  }
}

export async function uploadIdentityArtifactAction(formData: FormData): Promise<SimpleFormState> {
  try {
    const res = await studentUpload<{ data: { id?: number } }>('/identity-verification/artifacts', formData);
    revalidatePath('/panel/identity-verification');
    revalidatePath('/panel/profile');
    const artifactId = res.data?.id;
    return {
      success: 'مدرک با موفقیت بارگذاری شد.',
      data: typeof artifactId === 'number' ? { artifact_id: artifactId } : undefined,
    };
  } catch (err) {
    return identityActionError(err, 'بارگذاری مدرک ناموفق بود.');
  }
}

export async function submitIdentityVerificationAction(formData: FormData): Promise<SimpleFormState> {
  try {
    await studentUpload('/identity-verification/submit', formData);
  } catch (err) {
    return identityActionError(err, 'ارسال پرونده تأیید هویت ناموفق بود.');
  }

  revalidatePath('/panel/identity-verification');
  revalidatePath('/panel/profile');
  revalidatePath('/panel/referrals');
  revalidatePath('/panel/sat');
  return { success: 'پرونده شما با موفقیت ارسال شد و در صف بررسی قرار گرفت.' };
}

export async function verifyMobileOwnershipAction(): Promise<SimpleFormState> {
  try {
    const res = await studentFetch<{ data?: { result?: string; message?: string }; message?: string }>(
      '/mobile-ownership/verify',
      { method: 'POST' },
    );
    revalidatePath('/panel/profile');
    revalidatePath('/panel/referrals');
    const result = res.data?.result;
    if (result === 'matched' || result === 'MATCHED') {
      return { success: 'مالکیت شماره موبایل تأیید شد. اکنون می‌توانید درخواست واریز ثبت کنید.' };
    }
    if (result === 'mismatched' || result === 'MISMATCHED') {
      return { error: res.data?.message ?? 'شماره موبایل با کد ملی مطابقت ندارد.' };
    }
    return { success: res.data?.message ?? res.message ?? 'درخواست تطبیق ثبت شد.' };
  } catch (err) {
    return identityActionError(err, 'تأیید مالکیت شماره ناموفق بود.');
  }
}
