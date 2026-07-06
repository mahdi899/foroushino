import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SERVER_API_URL } from '@/lib/api/config';
import { DEFAULT_PUBLIC_PERF, type PublicPerfConfig } from './types';

async function fetchPublicPerfConfig(): Promise<PublicPerfConfig> {
  try {
    const res = await fetch(`${SERVER_API_URL}/cache/public`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60, tags: ['settings'] },
    });
    if (!res.ok) throw new Error();
    const json = (await res.json()) as { data?: PublicPerfConfig };
    return { ...DEFAULT_PUBLIC_PERF, ...json.data };
  } catch {
    return DEFAULT_PUBLIC_PERF;
  }
}

const cachedPublicPerf = unstable_cache(fetchPublicPerfConfig, ['cache-public-perf'], {
  revalidate: 60,
  tags: ['settings'],
});

/** Server-side performance flags from Laravel cache settings. */
export const getPublicPerfConfig = cache(cachedPublicPerf);
