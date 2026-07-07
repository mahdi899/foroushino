import 'server-only';

import { getRevalidateSeconds, type RevalidateKey } from '@/lib/cache/revalidate';
import type { ApiResult } from './api';

function publicApiBase(): string {
  const internal = process.env.API_INTERNAL_URL?.replace(/\/+$/, '');
  if (internal) {
    return internal.endsWith('/api') ? internal : `${internal}/api`;
  }
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  return `${backend}/api`;
}

function publicApiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const suffix = normalized.startsWith('/api/') ? normalized.slice(4) : normalized;
  return `${publicApiBase()}${suffix}`;
}

type StaticFetchOptions = {
  ttlKey: RevalidateKey;
  tags: string[];
};

/**
 * ISR-aware GET for public content (articles, transformations, etc.).
 * Forms, checkout, and chat must keep using getJson/postJson with no-store.
 */
export async function getStaticJson<T>(
  path: string,
  options: StaticFetchOptions,
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);

  try {
    const revalidate = await getRevalidateSeconds(options.ttlKey);
    const res = await fetch(publicApiUrl(path), {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
      next: { revalidate, tags: options.tags },
    });

    if (!res.ok) {
      let message = 'درخواست انجام نشد. لطفاً دوباره تلاش کن.';
      try {
        const payload = (await res.json()) as { error?: { message_fa?: string } };
        if (payload?.error?.message_fa) message = payload.error.message_fa;
      } catch {
        // keep default
      }
      return { ok: false, error: message, status: res.status };
    }

    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'ارتباط با سرور برقرار نشد. اتصال اینترنت را بررسی کن.' };
  } finally {
    clearTimeout(timer);
  }
}
