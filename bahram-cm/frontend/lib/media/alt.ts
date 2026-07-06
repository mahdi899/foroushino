import 'server-only';

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { SERVER_API_URL } from '@/lib/api/config';
import { persistMediaUrl } from '@/lib/mediaUrl';
import { coalesceAlt, staticAltForSrc } from '@/lib/media/altShared';

async function fetchMediaAlt(ref: string): Promise<string | null> {
  try {
    const res = await fetch(`${SERVER_API_URL}/media/alt?ref=${encodeURIComponent(ref)}`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 300, tags: ['media-alt'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: { alt_fa?: string | null } };
    const alt = json.data?.alt_fa?.trim();
    return alt || null;
  } catch {
    return null;
  }
}

const cachedFetchMediaAlt = unstable_cache(
  async (ref: string) => fetchMediaAlt(ref),
  ['media-alt-lookup'],
  { revalidate: 300, tags: ['media-alt'] },
);

/** Server-side alt from media library (admin-controlled). */
export const resolveMediaAlt = cache(async (
  src: string | null | undefined,
  fallback?: string | null,
): Promise<string> => {
  if (!src?.trim()) return coalesceAlt(null, fallback, src);

  const ref = persistMediaUrl(src);
  const fromStatic = staticAltForSrc(src);
  if (fromStatic) return fromStatic;

  const fromApi = await cachedFetchMediaAlt(ref);
  return coalesceAlt(fromApi, fallback ?? fromStatic, src);
});
