import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';
export const ADMIN_TOKEN_COOKIE = 'bahram_admin_token';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  mobile?: string | null;
  roles: string[];
  permissions: string[];
  is_super_admin?: boolean;
}

/** Read the Sanctum personal-access token from the httpOnly cookie. */
export const getToken = cache(async (): Promise<string | undefined> => {
  const jar = await cookies();
  return jar.get(ADMIN_TOKEN_COOKIE)?.value;
});
/**
 * Authenticated server-side fetch against the Laravel API using the stored
 * bearer token. Throws { status } on non-2xx so callers can branch on auth.
 */
export async function adminFetch<T = unknown>(
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
    const err = new Error(`Admin API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Resolve the current admin user; returns null when unauthenticated. */
export const getCurrentUser = cache(async (): Promise<AdminUser | null> => {
  if (!(await getToken())) return null;
  try {
    const res = await adminFetch<{ data: AdminUser }>('/auth/me');
    return res.data;
  } catch {
    return null;
  }
});
/** Permission gate helper for server components / actions. */
export function isSuperAdmin(user: AdminUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.is_super_admin || user.roles.includes('super-admin') || user.roles.includes('SUPER_ADMIN'),
  );
}

/** Permission gate helper for server components / actions. */
export function can(user: AdminUser | null, permission: string): boolean {
  if (!user) return false;
  if (isSuperAdmin(user)) {
    return true;
  }
  return user.permissions.includes(permission);
}
