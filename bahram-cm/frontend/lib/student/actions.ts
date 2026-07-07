'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from './session';

export interface OtpAuthState {
  step: 'mobile' | 'otp';
  mobile?: string;
  error?: string;
  info?: string;
}

async function callStudentAuth(path: string, body: unknown): Promise<{ ok: boolean; data?: any; message?: string }> {
  try {
    const res = await fetch(`${SERVER_API_URL}/student${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, message: json?.error?.message_fa ?? 'خطایی رخ داد. دوباره تلاش کنید.' };
    }
    return { ok: true, data: json?.data };
  } catch {
    return { ok: false, message: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کنید.' };
  }
}

async function setStudentTokenCookie(token: string) {
  const jar = await cookies();
  jar.set(STUDENT_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function sendOtpAction(_prev: OtpAuthState, formData: FormData): Promise<OtpAuthState> {
  const mobile = String(formData.get('mobile') ?? '').trim();
  if (!mobile) return { step: 'mobile', error: 'شماره موبایل را وارد کنید.' };

  const result = await callStudentAuth('/auth/send-otp', { mobile });
  if (!result.ok) return { step: 'mobile', mobile, error: result.message };

  return { step: 'otp', mobile, info: 'کد تایید برای شما پیامک شد.' };
}

export async function verifyOtpAction(_prev: OtpAuthState, formData: FormData): Promise<OtpAuthState> {
  const mobile = String(formData.get('mobile') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();

  if (!mobile) return { step: 'mobile', error: 'شماره موبایل نامعتبر است.' };
  if (!code) return { step: 'otp', mobile, error: 'کد تایید را وارد کنید.' };

  const result = await callStudentAuth('/auth/verify-otp', { mobile, code });
  if (!result.ok) return { step: 'otp', mobile, error: result.message };

  await setStudentTokenCookie(result.data.token);
  redirect('/panel');
}

export interface PasswordAuthState {
  error?: string;
}

export async function loginPasswordAction(_prev: PasswordAuthState, formData: FormData): Promise<PasswordAuthState> {
  const mobile = String(formData.get('mobile') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!mobile || !password) return { error: 'شماره موبایل و رمز عبور را وارد کنید.' };

  const result = await callStudentAuth('/auth/login-password', { mobile, password });
  if (!result.ok) return { error: result.message };

  await setStudentTokenCookie(result.data.token);
  redirect('/panel');
}

export async function logoutStudentAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(STUDENT_TOKEN_COOKIE)?.value;
  if (token) {
    await fetch(`${SERVER_API_URL}/student/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => {});
  }
  jar.delete(STUDENT_TOKEN_COOKIE);
  redirect('/panel/login');
}
