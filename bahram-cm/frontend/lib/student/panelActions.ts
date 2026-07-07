'use server';

import { revalidatePath } from 'next/cache';
import { studentFetch } from './session';

export interface SimpleFormState {
  error?: string;
  success?: string;
}

function extractError(err: unknown, fallback: string): string {
  const e = err as { status?: number; payload?: { error?: { message_fa?: string }; errors?: Record<string, string[]> } };
  if (e?.payload?.error?.message_fa) return e.payload.error.message_fa;
  const firstFieldError = e?.payload?.errors ? Object.values(e.payload.errors)[0]?.[0] : undefined;
  return firstFieldError ?? fallback;
}

export async function updateProfileAction(_prev: SimpleFormState, formData: FormData): Promise<SimpleFormState> {
  const payload: Record<string, unknown> = {};
  for (const key of [
    'name', 'first_name', 'last_name', 'email', 'city', 'age',
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
    card_number: String(formData.get('card_number') ?? '').replace(/\D/g, ''),
    card_holder_name: formData.get('card_holder_name') || null,
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
}
