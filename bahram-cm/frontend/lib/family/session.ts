import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
import { STUDENT_TOKEN_COOKIE } from '@/lib/student/session';

/**
 * Family reuses the existing student mobile+OTP session (same User model,
 * same Sanctum token). No parallel auth system — see lib/student/session.ts.
 */
export const getFamilyToken = cache(async (): Promise<string | undefined> => {
  const jar = await cookies();
  return jar.get(STUDENT_TOKEN_COOKIE)?.value;
});

export async function familyFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = await getFamilyToken();
  const url = `${SERVER_API_URL}/family${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = new Error(`Family API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
