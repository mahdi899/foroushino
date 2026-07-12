import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';

export const SAT_TOKEN_COOKIE = 'bahram_sat_token';

export interface SatUser {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  role?: string;
  role_label?: string;
  permissions: string[];
  is_super_admin?: boolean;
  sat_leader_id?: number | null;
}

export const getToken = cache(async (): Promise<string | undefined> => {
  const jar = await cookies();
  return jar.get(SAT_TOKEN_COOKIE)?.value;
});

export async function satFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; query?: Record<string, string | number | undefined> } = {},
): Promise<T> {
  const token = await getToken();
  const url = new URL(`${SERVER_API_URL}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined && v !== '') url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    const err = new Error(`SAT API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const getCurrentSatUser = cache(async (): Promise<SatUser | null> => {
  if (!(await getToken())) return null;
  try {
    const res = await satFetch<{ data: SatUser }>('/sat/me');
    return res.data;
  } catch {
    return null;
  }
});

export function satCan(user: SatUser | null, permission: string): boolean {
  if (!user) return false;
  if (user.is_super_admin) return true;
  return user.permissions.includes(permission);
}
