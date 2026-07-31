import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
import { forwardedClientHeaders } from '@/lib/api/forwardedClientHeaders';
import { serverFetchSignal } from '@/lib/api/serverFetch';
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
  options: { method?: string; body?: unknown; ifNoneMatch?: string | null } = {},
): Promise<T> {
  const token = await getFamilyToken();
  const url = `${SERVER_API_URL}/family${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await forwardedClientHeaders()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.ifNoneMatch ? { 'If-None-Match': options.ifNoneMatch } : {}),
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
    signal: serverFetchSignal(),
  });

  if (res.status === 304) {
    return { __notModified: true } as T;
  }

  if (!res.ok) {
    const err = new Error(`Family API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export type FamilyConditionalResult<T> =
  | { notModified: true }
  | { notModified: false; data: T; etag: string | null };

/** GET with If-None-Match — returns notModified when the API responds 304. */
export async function familyFetchConditional<T = unknown>(
  path: string,
  ifNoneMatch?: string | null,
): Promise<FamilyConditionalResult<T>> {
  const token = await getFamilyToken();
  const url = `${SERVER_API_URL}/family${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(await forwardedClientHeaders()),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(ifNoneMatch ? { 'If-None-Match': ifNoneMatch } : {}),
  };

  const res = await fetch(url, {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal: serverFetchSignal(),
  });

  if (res.status === 304) {
    return { notModified: true };
  }

  if (!res.ok) {
    const err = new Error(`Family API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  const etag = res.headers.get('ETag');
  const json = (await res.json()) as { data: T };

  return { notModified: false, data: json.data, etag };
}
