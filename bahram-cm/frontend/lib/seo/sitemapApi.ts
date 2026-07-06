import 'server-only';

import { PUBLIC_API_URL } from '@/lib/api/config';
import type { SitemapChunkResponse, SitemapIndexEntry } from './sitemapXml';

const isDev = process.env.NODE_ENV === 'development';

function fetchOpts() {
  if (isDev) {
    return { cache: 'no-store' as const };
  }
  return { next: { revalidate: 3600, tags: ['seo'] as string[] } };
}

export async function fetchSitemapIndex(): Promise<SitemapIndexEntry[]> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/seo/sitemap/index`, fetchOpts());
    if (!res.ok) return [];
    const json = (await res.json()) as { data?: SitemapIndexEntry[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchSitemapChunk(section: string, page: number): Promise<SitemapChunkResponse | null> {
  try {
    const res = await fetch(`${PUBLIC_API_URL}/seo/sitemap/${encodeURIComponent(section)}/${page}`, fetchOpts());
    if (!res.ok) return null;
    const json = (await res.json()) as { data?: SitemapChunkResponse };
    return json.data ?? null;
  } catch {
    return null;
  }
}
