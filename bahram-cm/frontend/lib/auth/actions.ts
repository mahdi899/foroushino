'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SERVER_API_URL } from '@/lib/api/config';
import { ADMIN_TOKEN_COOKIE } from './session';

export interface LoginState {
  error?: string;
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  const from = String(formData.get('from') ?? '/admin');

  let token: string | undefined;
  try {
    const res = await fetch(`${SERVER_API_URL}/auth/login`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
    if (!res.ok) {
      return { error: 'ایمیل یا رمز عبور نادرست است.' };
    }
    const json = await res.json();
    token = json.token;
  } catch {
    return { error: 'ارتباط با سرور برقرار نشد. دوباره تلاش کنید.' };
  }

  if (!token) return { error: 'ورود ناموفق بود.' };

  const jar = await cookies();
  jar.set(ADMIN_TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect(from.startsWith('/admin') ? from : '/admin');
}

export async function logoutAction(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(ADMIN_TOKEN_COOKIE)?.value;
  if (token) {
    await fetch(`${SERVER_API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }).catch(() => {});
  }
  jar.delete(ADMIN_TOKEN_COOKIE);
  redirect('/admin/login');
}
