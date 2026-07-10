'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch, getToken } from '@/lib/auth/session';
import { SERVER_API_URL } from '@/lib/api/config';
import type {
  AdminCashbackPayoutRevealed,
  AdminStudent,
  AdminTicket,
  AdminTicketDetail,
  AdminTicketReport,
  AdminTicketUserGroup,
  PageMeta,
} from '@/lib/admin/academyTypes';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & { payload?: { error?: { message_fa?: string } } };
  return { ok: false, error: err.payload?.error?.message_fa ?? fallback };
}

/** Multipart upload helper — adminFetch only supports JSON bodies. */
async function adminUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${SERVER_API_URL}${path}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = new Error(`Admin API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return (await res.json()) as T;
}

function revalidateAcademy() {
  revalidatePath('/admin/academy', 'layout');
}

// Students
export async function searchStudentsForPicker(input: { search?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminStudent[]; meta: PageMeta }>('/students', {
      query: {
        search: input.search?.trim() || undefined,
        page: input.page ?? 1,
        per_page: 20,
      },
    });
    return {
      ok: true as const,
      items: res.data,
      meta: res.meta,
    };
  } catch (e) {
    return {
      ok: false as const,
      items: [] as AdminStudent[],
      meta: null,
      error: actionError(e, 'بارگذاری لیست دانشجوها ناموفق بود.').error,
    };
  }
}

export async function createStudent(input: {
  name: string;
  mobile: string;
  email?: string;
  status?: string;
}): Promise<{ ok: true; id: number } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data: { id: number } }>('/students', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const, id: res.data.id };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string; errors?: Record<string, string[]> } };
    const message =
      err.payload?.errors?.mobile?.[0] ??
      err.payload?.errors?.email?.[0] ??
      err.payload?.message ??
      'ثبت دانشجو ناموفق بود.';
    return { ok: false, error: message };
  }
}

export async function updateStudentStatus(id: number, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/students/${id}`, { method: 'PATCH', body: { status } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت دانشجو ناموفق بود.');
  }
}

export async function exportStudentsCsv(filters?: {
  search?: string;
  status?: string;
}): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  try {
    const token = await getToken();
    const url = new URL(`${SERVER_API_URL}/panel/students/export`);
    if (filters?.search) url.searchParams.set('search', filters.search);
    if (filters?.status) url.searchParams.set('status', filters.status);

    const res = await fetch(url, {
      headers: {
        Accept: 'text/csv',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return { ok: false, error: 'خروجی گرفتن از دانشجوها ناموفق بود.' };
    }

    return { ok: true, csv: await res.text() };
  } catch {
    return { ok: false, error: 'خروجی گرفتن از دانشجوها ناموفق بود.' };
  }
}

// Course accesses
export async function grantCourseAccess(input: { mobile: string; name?: string; product_id: number }) {
  try {
    await adminFetch('/course-accesses', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'اعطای دسترسی دوره ناموفق بود.');
  }
}

export async function updateCourseAccessStatus(id: number, status: string) {
  try {
    await adminFetch(`/course-accesses/${id}`, { method: 'PATCH', body: { status } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی دسترسی ناموفق بود.');
  }
}

// Seminars
export async function createSeminar(input: {
  title: string;
  date: string;
  location?: string;
  description?: string;
  status?: string;
  price?: number;
  sale_price?: number | null;
  capacity?: number | null;
  banner_available?: string;
  banner_available_mobile?: string;
  banner_full?: string;
  banner_full_mobile?: string;
  cover_image?: string | null;
  cover_image_mobile?: string | null;
  promo_enabled?: boolean;
}) {
  try {
    const res = await adminFetch<{ data: { id: number } }>('/seminars', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const, id: res.data.id };
  } catch (e) {
    return actionError(e, 'ایجاد سمینار ناموفق بود.');
  }
}

export async function updateSeminar(id: number, input: Record<string, unknown>) {
  try {
    await adminFetch(`/seminars/${id}`, { method: 'PATCH', body: input });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'ذخیره سمینار ناموفق بود.');
  }
}

export async function addSeminarAttendee(seminarId: number, input: { mobile: string; name?: string }) {
  try {
    await adminFetch(`/seminars/${seminarId}/attendees`, { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'افزودن شرکت‌کننده ناموفق بود.');
  }
}

export async function updateSeminarAttendee(seminarId: number, attendeeId: number, status: string) {
  try {
    await adminFetch(`/seminars/${seminarId}/attendees/${attendeeId}`, { method: 'PATCH', body: { attendance_status: status } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت حضور ناموفق بود.');
  }
}

export async function uploadSeminarAsset(seminarId: number, formData: FormData) {
  try {
    await adminUpload(`/seminars/${seminarId}/assets`, formData);
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'بارگذاری فایل سمینار ناموفق بود.');
  }
}

export async function deleteSeminarAsset(seminarId: number, assetId: number) {
  try {
    await adminFetch(`/seminars/${seminarId}/assets/${assetId}`, { method: 'DELETE' });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'حذف فایل ناموفق بود.');
  }
}

export async function issueSeminarCertificate(seminarId: number, formData: FormData) {
  try {
    await adminUpload(`/seminars/${seminarId}/certificates`, formData);
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'صدور گواهی ناموفق بود.');
  }
}

// Referrals
export async function updateReferralConversionStatus(id: number, status: string) {
  try {
    await adminFetch(`/referrals/${id}`, { method: 'PATCH', body: { status } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت معرفی ناموفق بود.');
  }
}

// Cashback payouts
export async function revealCashbackPayout(id: number): Promise<{ ok: true; data: AdminCashbackPayoutRevealed } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data: AdminCashbackPayoutRevealed }>(`/cashback-payouts/${id}`);
    return { ok: true as const, data: res.data };
  } catch (e) {
    return actionError(e, 'نمایش شماره کارت ناموفق بود.');
  }
}

export async function updateCashbackPayoutStatus(id: number, status: string, adminNote?: string) {
  try {
    await adminFetch(`/cashback-payouts/${id}`, { method: 'PATCH', body: { status, admin_note: adminNote } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت واریز ناموفق بود.');
  }
}

// SAT applications
export async function updateSatApplicationStatus(id: number, status: string, adminNote?: string) {
  try {
    await adminFetch(`/sat-applications/${id}`, { method: 'PATCH', body: { status, admin_note: adminNote } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت سات ناموفق بود.');
  }
}

// Tickets
export async function createTicketForStudent(input: {
  mobile?: string;
  user_id?: number;
  subject: string;
  message: string;
  department?: string;
}) {
  try {
    const res = await adminFetch<{ data: { id: number } }>('/tickets', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const, id: res.data.id };
  } catch (e) {
    return actionError(e, 'ثبت تیکت برای دانشجو ناموفق بود.');
  }
}

export async function fetchTicketUsers(input: { search?: string; page?: number } = {}) {
  try {
    const res = await adminFetch<{ data: AdminTicketUserGroup[]; meta: PageMeta }>('/tickets/users', {
      query: { search: input.search?.trim() || undefined, page: input.page ?? 1 },
    });
    return { ok: true as const, items: res.data, meta: res.meta };
  } catch (e) {
    return { ok: false as const, items: [] as AdminTicketUserGroup[], meta: null, error: actionError(e, 'بارگذاری کاربران دارای تیکت ناموفق بود.').error };
  }
}

export async function fetchTicketsByUser(userId: number) {
  try {
    const res = await adminFetch<{ data: AdminTicket[]; meta: PageMeta }>('/tickets', {
      query: { user_id: userId, per_page: 50 },
    });
    return { ok: true as const, items: res.data, meta: res.meta };
  } catch (e) {
    return { ok: false as const, items: [] as AdminTicket[], meta: null, error: actionError(e, 'بارگذاری تیکت‌های کاربر ناموفق بود.').error };
  }
}

export async function fetchTicketDetail(id: number) {
  try {
    const res = await adminFetch<{ data: AdminTicketDetail }>(`/tickets/${id}`);
    return { ok: true as const, data: res.data };
  } catch (e) {
    return { ok: false as const, data: null, error: actionError(e, 'بارگذاری جزئیات تیکت ناموفق بود.').error };
  }
}

export async function fetchTicketReports(input: { from?: string; to?: string; status?: string; department?: string } = {}) {
  try {
    const res = await adminFetch<{ data: AdminTicketReport }>('/tickets/reports', {
      query: { from: input.from || undefined, to: input.to || undefined, status: input.status || undefined, department: input.department || undefined },
    });
    return { ok: true as const, data: res.data };
  } catch (e) {
    return { ok: false as const, data: null, error: actionError(e, 'بارگذاری گزارش تیکت ناموفق بود.').error };
  }
}

export async function replyToTicket(id: number, message: string) {
  try {
    await adminFetch(`/tickets/${id}/messages`, { method: 'POST', body: { message } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'ارسال پاسخ ناموفق بود.');
  }
}

export async function updateTicketStatus(id: number, status: string) {
  try {
    await adminFetch(`/tickets/${id}`, { method: 'PATCH', body: { status } });
    revalidateAcademy();
    return { ok: true as const };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی وضعیت تیکت ناموفق بود.');
  }
}

// Notifications
export async function sendNotification(input: { title: string; body: string; segment: string; type?: string; link?: string }) {
  try {
    const res = await adminFetch<{ data: { id: number; recipients_count: number } }>('/notifications', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const, recipientsCount: res.data.recipients_count };
  } catch (e) {
    return actionError(e, 'ارسال اعلان ناموفق بود.');
  }
}

// SMS center
export async function sendSms(input: { message: string; segment?: string; manual_numbers?: string }) {
  try {
    const res = await adminFetch<{ data: { total: number; sent: number; failed: number } }>('/sms/send', { method: 'POST', body: input });
    revalidateAcademy();
    return { ok: true as const, ...res.data };
  } catch (e) {
    return actionError(e, 'ارسال پیامک ناموفق بود.');
  }
}

export async function testSms(phone: string, message?: string) {
  try {
    const res = await adminFetch<{ data: { success: boolean; message: string; provider_code?: string | null } }>('/sms/test', {
      method: 'POST',
      body: { phone, message: message?.trim() || undefined },
    });
    if (res.data.success) {
      return { ok: true as const, message: res.data.message, providerCode: res.data.provider_code ?? null };
    }
    return { ok: false as const, error: res.data.message, providerCode: res.data.provider_code ?? null };
  } catch (e) {
    return actionError(e, 'تست پیامک ناموفق بود.');
  }
}

// Imports
export async function previewStudentImport(formData: FormData) {
  try {
    const res = await adminUpload<{ data: { rows: unknown[]; valid_count: number; error_count: number } }>('/imports/students/preview', formData);
    return { ok: true as const, ...res.data };
  } catch (e) {
    return actionError(e, 'پیش‌نمایش فایل ناموفق بود.');
  }
}

export async function commitStudentImport(formData: FormData) {
  try {
    const res = await adminUpload<{ data: { rows: unknown[]; valid_count: number; error_count: number } }>('/imports/students/commit', formData);
    revalidateAcademy();
    return { ok: true as const, ...res.data };
  } catch (e) {
    return actionError(e, 'ثبت نهایی فایل ناموفق بود.');
  }
}

/** Open tickets awaiting admin response — for sidebar alert badge. */
export async function fetchPendingTicketsCount(): Promise<number> {
  try {
    const res = await adminFetch<{ data: unknown[]; meta: { total: number } }>('/tickets', {
      query: { status: 'open', per_page: 1, page: 1 },
    });
    return res.meta?.total ?? 0;
  } catch {
    return 0;
  }
}
