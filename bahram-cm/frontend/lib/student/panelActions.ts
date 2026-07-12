'use server';

import { revalidatePath } from 'next/cache';
import { extractError, type SimpleFormState } from './panelFormUtils';
import { studentFetch } from './session';

export type { SimpleFormState };

export async function updateProfileAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload: Record<string, unknown> = {};
  for (const key of [
    'name', 'email', 'age',
    'current_job', 'instagram', 'telegram', 'experience_level', 'income_goal',
  ]) {
    const value = formData.get(key);
    if (value !== null) payload[key] = value === '' ? null : value;
  }

  const password = formData.get('password');
  const passwordConfirmation = formData.get('password_confirmation');
  if (password) {
    payload.password = password;
    payload.password_confirmation = passwordConfirmation;
  }

  try {
    await studentFetch('/profile', { method: 'PUT', body: payload });
  } catch (err) {
    return { error: extractError(err, 'ذخیره پروفایل انجام نشد.') };
  }

  revalidatePath('/panel/profile');
  revalidatePath('/panel');
  return { success: 'پروفایل با موفقیت بروزرسانی شد.' };
}

export async function sendPasswordChangeOtpAction(): Promise<SimpleFormState> {
  try {
    await studentFetch('/profile/password/send-otp', { method: 'POST' });
  } catch (err) {
    return { error: extractError(err, 'ارسال کد تأیید انجام نشد.') };
  }

  return { success: 'کد تأیید به شماره شما ارسال شد.' };
}

export async function changePasswordAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload = {
    code: String(formData.get('code') ?? '').trim(),
    password: String(formData.get('password') ?? ''),
    password_confirmation: String(formData.get('password_confirmation') ?? ''),
  };

  if (!payload.code) {
    return { error: 'کد تأیید را وارد کنید.' };
  }

  try {
    await studentFetch('/profile/password', { method: 'PUT', body: payload });
  } catch (err) {
    return { error: extractError(err, 'تغییر رمز عبور انجام نشد.') };
  }

  revalidatePath('/panel/profile');
  revalidatePath('/panel');
  return { success: 'رمز عبور با موفقیت تغییر کرد.' };
}

export async function uploadProfileAvatarAction(formData: FormData): Promise<SimpleFormState> {
  const file = formData.get('avatar');
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'فایل تصویر انتخاب نشده است.' };
  }

  const body = new FormData();
  body.append('avatar', file);

  try {
    await studentFetch('/profile/avatar', { method: 'POST', body, isFormData: true });
  } catch (err) {
    return { error: extractError(err, 'بارگذاری تصویر پروفایل انجام نشد.') };
  }

  revalidatePath('/panel/profile');
  revalidatePath('/panel', 'layout');
  return { success: 'تصویر پروفایل با موفقیت ذخیره شد.' };
}

export async function markOnboardingStepAction(step: string): Promise<void> {
  try {
    await studentFetch(`/dashboard/steps/${step}`, { method: 'POST' });
  } catch {
    // Best effort — the checklist simply won't tick this item.
  }
  revalidatePath('/panel');
}

export async function submitSatApplicationAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload = {
    name: formData.get('name'),
    city: formData.get('city') || null,
    age: formData.get('age') ? Number(formData.get('age')) : null,
  };

  try {
    await studentFetch('/sat-application', { method: 'POST', body: payload });
  } catch (err) {
    return { error: extractError(err, 'ثبت درخواست سات انجام نشد.') };
  }

  revalidatePath('/panel/sat');
  revalidatePath('/panel');
  return { success: 'درخواست شما با موفقیت ثبت شد.' };
}

export async function requestCashbackPayoutAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload = {
    verified_bank_account_id: Number(formData.get('verified_bank_account_id')),
  };

  try {
    await studentFetch('/cashback-payouts', { method: 'POST', body: payload });
  } catch (err) {
    return { error: extractError(err, 'ثبت درخواست واریز انجام نشد.') };
  }

  revalidatePath('/panel/referrals');
  return { success: 'درخواست واریز با موفقیت ثبت شد.' };
}

export async function createTicketAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload = {
    department: formData.get('department') || null,
    subject: formData.get('subject'),
    message: formData.get('message'),
  };

  try {
    await studentFetch('/tickets', { method: 'POST', body: payload });
  } catch (err) {
    return { error: extractError(err, 'ثبت تیکت انجام نشد.') };
  }

  revalidatePath('/panel/support');
  revalidatePath('/panel/notifications');
  return { success: 'تیکت شما با موفقیت ثبت شد.' };
}

export async function replyTicketAction(ticketId: number, _prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload = { message: formData.get('message') };

  try {
    await studentFetch(`/tickets/${ticketId}/messages`, { method: 'POST', body: payload });
  } catch (err) {
    return { error: extractError(err, 'ارسال پاسخ انجام نشد.') };
  }

  revalidatePath(`/panel/support/${ticketId}`);
  return { success: 'پاسخ شما ثبت شد.' };
}

export async function markNotificationReadAction(notificationId: number): Promise<void> {
  try {
    await studentFetch(`/notifications/${notificationId}/read`, { method: 'POST' });
  } catch {
    // best effort
  }
  revalidatePath('/panel/notifications');
  revalidatePath('/panel');
}

export async function markAllNotificationsReadAction(): Promise<void> {
  try {
    await studentFetch('/notifications/read-all', { method: 'POST' });
  } catch {
    // best effort
  }
  revalidatePath('/panel/notifications');
  revalidatePath('/panel');
}

export interface PanelNotificationPayload {
  id: number;
  title: string;
  body: string;
  type?: string | null;
  link: string | null;
  link_label?: string | null;
  read_at: string | null;
  created_at: string | null;
  show_toast?: boolean;
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  try {
    const res = await studentFetch<{ data: { unread_count: number } }>('/notifications/unread-count');
    return res.data.unread_count;
  } catch {
    return 0;
  }
}

export async function fetchRecentNotifications(perPage = 15, unreadOnly = false): Promise<PanelNotificationPayload[]> {
  try {
    const query = unreadOnly ? '&unread_only=1' : '';
    const res = await studentFetch<{ data: PanelNotificationPayload[] }>(`/notifications?per_page=${perPage}${query}`);
    return res.data ?? [];
  } catch {
    return [];
  }
}
