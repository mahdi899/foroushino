import { SERVER_API_URL, PUBLIC_API_URL } from './config';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status: number, errors?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  // Next.js fetch caching controls (server only).
  revalidate?: number | false;
  tags?: string[];
  // Force client base URL even on server (rarely needed).
  client?: boolean;
  // Send cookies — only needed for Sanctum session auth; public forms omit.
  credentials?: RequestCredentials;
}

const isServer = typeof window === 'undefined';

/**
 * Typed fetch wrapper around the Laravel API. Normalizes errors into ApiError,
 * forwards cookies (credentials) for Sanctum auth, and wires Next ISR options.
 */
export async function apiFetch<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, revalidate, tags, client, credentials, headers, ...rest } = options;
  const base = client || !isServer ? PUBLIC_API_URL : SERVER_API_URL;
  const url = path.startsWith('http') ? path : `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const init: RequestInit & { next?: { revalidate?: number | false; tags?: string[] } } = {
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(headers as Record<string, string>),
    },
    // Public site forms don't need session cookies; omit avoids CSRF/session edge cases.
    credentials: credentials ?? (client ? 'omit' : 'include'),
  };

  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // ISR controls only apply to server-side fetches.
  if (isServer && !client) {
    init.next = {};
    if (revalidate !== undefined) init.next.revalidate = revalidate;
    if (tags) init.next.tags = tags;
  } else {
    init.cache = init.cache ?? 'no-store';
  }

  const res = await fetch(url, init);

  if (res.status === 204) return undefined as T;

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(
      (payload && (payload.message as string)) || `Request failed (${res.status})`,
      res.status,
      payload?.errors,
    );
  }

  return payload as T;
}

/** Unwrap a `{ data: T }` envelope. */
export async function apiData<T>(path: string, options?: ApiFetchOptions): Promise<T> {
  const res = await apiFetch<{ data: T }>(path, options);
  return (res as { data: T }).data;
}
