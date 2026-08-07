import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SERVER_API_URL } from '@/lib/api/config';
import { isCacheDisabled } from '@/lib/perfFlags';
import { DEFAULT_PUBLIC_PERF, type PublicPerfConfig } from './types';

const isProductionBuild = process.env.NEXT_PHASE === 'phase-production-build';

async function fetchPublicPerfConfig(): Promise<PublicPerfConfig> {
  if (isCacheDisabled()) {
    return DEFAULT_PUBLIC_PERF;
  }

  const controller = new AbortController();
  // Build must not hang / spam when Laravel is briefly offline on local.
  const timeoutMs = isProductionBuild ? 2500 : 8000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${SERVER_API_URL}/cache/public`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('perf fetch failed');
    const json = (await res.json()) as { data?: PublicPerfConfig };
    return { ...DEFAULT_PUBLIC_PERF, ...json.data };
  } catch {
    return DEFAULT_PUBLIC_PERF;
  } finally {
    clearTimeout(timer);
  }
}

const cachedPublicPerf = unstable_cache(fetchPublicPerfConfig, ['cache-public-perf'], {
  revalidate: isCacheDisabled() ? 1 : 60,
  tags: ['settings'],
});

/** Server-side performance flags from Laravel cache settings. */
export const getPublicPerfConfig = cache(async (): Promise<PublicPerfConfig> => {
  if (isCacheDisabled()) {
    return DEFAULT_PUBLIC_PERF;
  }
  return cachedPublicPerf();
});
