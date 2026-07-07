import type { PublicPerfConfig } from './types';
import { DEFAULT_PUBLIC_PERF } from './types';

let cached: { at: number; config: PublicPerfConfig } | null = null;
const TTL_MS = 60_000;

function apiBase(): string {
  const internal = process.env.API_INTERNAL_URL?.replace(/\/+$/, '');
  if (internal) return internal;
  const backend = (process.env.BACKEND_PROXY_URL ?? 'http://127.0.0.1:8010').replace(/\/+$/, '');
  return `${backend}/api/v1`;
}

/** Lightweight perf flags for middleware (cached ~60s). */
export async function getMiddlewarePerfConfig(): Promise<PublicPerfConfig> {
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.config;
  }

  try {
    const res = await fetch(`${apiBase()}/cache/public`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('perf fetch failed');
    const json = (await res.json()) as { data?: PublicPerfConfig };
    const config = { ...DEFAULT_PUBLIC_PERF, ...json.data };
    cached = { at: Date.now(), config };
    return config;
  } catch {
    return DEFAULT_PUBLIC_PERF;
  }
}
