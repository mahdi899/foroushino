'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SERVER_API_URL } from '@/lib/api/config';
import { extractValidationMessage } from '@/lib/services/api';
import { STUDENT_TOKEN_COOKIE } from './session';

export interface OtpAuthState {
  step: 'mobile' | 'otp';
  mobile?: string;
  error?: string;
  info?: string;
}

type StudentAuthPayload = {
  token?: string;
  message?: string;
};

async function callStudentAuth(path: string, body: unknown): Promise<{ ok: boolean; data?: StudentAuthPayload; message?: string }> {
  try {
    const res = await fetch(`${SERVER_API_URL}/student${path}`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const captchaMsg = extractValidationMessage(json, 'captcha');
      return { ok: false, message: captchaMsg ?? json?.error?.message_fa ?? 'خطایی رخ داد. دوباره تلاش کنید.' };
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

export async function sendOtpViaBaleAction(mobile: string): Promise<{ ok: true; message: string } | { ok: false; error: string }> {
  const result = await callStudentAuth('/auth/send-otp-bale', { mobile: mobile.trim() });
  if (!result.ok) return { ok: false, error: result.message ?? 'ارسال کد از طریق بله ناموفق بود.' };

  return { ok: true, message: result.data?.message ?? 'کد تأیید از طریق سفیر بله ارسال شد.' };
}

export async function verifyOtpAction(_prev: OtpAuthState, formData: FormData): Promise<OtpAuthState> {
  const mobile = String(formData.get('mobile') ?? '').trim();
  const code = String(formData.get('code') ?? '').trim();

  if (!mobile) return { step: 'mobile', error: 'شماره موبایل نامعتبر است.' };
  if (!code) return { step: 'otp', mobile, error: 'کد تایید را وارد کنید.' };

  const result = await callStudentAuth('/auth/verify-otp', { mobile, code });
  if (!result.ok) return { step: 'otp', mobile, error: result.message };

  const token = result.data?.token;
  if (!token) return { step: 'otp', mobile, error: 'پاسخ سرور نامعتبر بود.' };

  await setStudentTokenCookie(token);
  redirect(resolveStudentLoginRedirect(formData));
}

export interface PasswordAuthState {
  error?: string;
}

export async function loginPasswordAction(_prev: PasswordAuthState, formData: FormData): Promise<PasswordAuthState> {
  const mobile = String(formData.get('mobile') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!mobile || !password) return { error: 'شماره موبایل و رمز عبور را وارد کنید.' };

  const result = await callStudentAuth('/auth/login-password', {
    mobile,
    password,
    captcha_token: formData.get('captcha_token') || undefined,
    captcha_id: formData.get('captcha_id') || undefined,
    captcha_answer: formData.get('captcha_answer') ?? undefined,
    website: formData.get('website') || undefined,
  });
  if (!result.ok) return { error: result.message };

  const token = result.data?.token;
  if (!token) return { error: 'پاسخ سرور نامعتبر بود.' };

  await setStudentTokenCookie(token);
  redirect(resolveStudentLoginRedirect(formData));
}

function resolveStudentLoginRedirect(formData: FormData): string {
  const redirectTo = String(formData.get('redirect_to') ?? '').trim();
  if (redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo;
  }

  return '/panel';
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
  // SpotPlayer cookie `X` is intentionally kept in the browser and also stored per user
  // on the server (spotplayer_x) so DRM session survives logout/login.
  redirect('/');
}
