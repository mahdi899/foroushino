import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { SERVER_API_URL } from '@/lib/api/config';

export const STUDENT_TOKEN_COOKIE = 'bahram_student_token';

export interface StudentProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  city: string | null;
  age: number | null;
  current_job: string | null;
  instagram: string | null;
  telegram: string | null;
  experience_level: string | null;
  income_goal: string | null;
  avatar: string | null;
  avatar_url: string | null;
  gravatar_url: string | null;
  default_avatar_url: string | null;
}

/** Legal identity fields — source of truth for name/city after KYC flow starts. */
export interface StudentIdentity {
  first_name: string | null;
  last_name: string | null;
  city: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

export interface StudentUser {
  id: number;
  name: string;
  mobile: string;
  has_password: boolean;
  first_login_at: string | null;
  profile: StudentProfile | null;
  identity?: StudentIdentity | null;
  /** 1 = base, 2 = identity approved, 3 = identity + mobile ownership */
  verification_level?: number;
  identity_status?: string | null;
  mobile_ownership_status?: string | null;
  sat_membership_status?: string | null;
  national_code_masked?: string | null;
}

/** Read the student's Sanctum personal-access token from the httpOnly cookie. */
export const getStudentToken = cache(async (): Promise<string | undefined> => {
  const jar = await cookies();
  return jar.get(STUDENT_TOKEN_COOKIE)?.value;
});

/**
 * Authenticated server-side fetch against the Laravel student API. Throws
 * { status } on non-2xx so callers/pages can branch (e.g. redirect on 401).
 */
export async function studentFetch<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown; isFormData?: boolean } = {},
): Promise<T> {
  const token = await getStudentToken();
  const url = `${SERVER_API_URL}/student${path.startsWith('/') ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  let body: BodyInit | undefined;

  if (options.body !== undefined) {
    if (options.isFormData && options.body instanceof FormData) {
      body = options.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = new Error(`Student API ${res.status}`) as Error & { status: number; payload?: unknown };
    err.status = res.status;
    err.payload = await res.json().catch(() => undefined);
    throw err;
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Resolve the current student; returns null when unauthenticated or blocked. */
export const getCurrentStudent = cache(async (): Promise<StudentUser | null> => {
  const result = await resolvePanelAccess();
  return result.user;
});

export const resolvePanelAccess = cache(async (): Promise<{ user: StudentUser | null; blocked: boolean }> => {
  if (!(await getStudentToken())) {
    return { user: null, blocked: false };
  }

  try {
    const res = await studentFetch<{ data: StudentUser }>('/me');
    return { user: res.data, blocked: false };
  } catch (e) {
    const err = e as Error & { status?: number; payload?: { error?: { code?: string } } };
    if (err.status === 403 && err.payload?.error?.code === 'account_blocked') {
      const jar = await cookies();
      jar.delete(STUDENT_TOKEN_COOKIE);
      return { user: null, blocked: true };
    }
    return { user: null, blocked: false };
  }
});
