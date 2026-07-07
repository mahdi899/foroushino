import type { PublicPerfConfig } from './types';

/** Build Cache-Control for public HTML document responses. */
export function buildPublicCacheControl(perf: PublicPerfConfig): string {
  if (perf.developer_mode || !perf.page_cache || !perf.browser_cache) {
    return 'no-store, must-revalidate';
  }

  const maxAge = Math.max(60, Math.min(perf.browser_cache_ttl || 3600, 86400));
  return `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * 2}`;
}

export function buildCdnCacheControl(perf: PublicPerfConfig): string | null {
  if (!perf.cdn_html_cache || perf.developer_mode || !perf.page_cache) return null;
  const maxAge = Math.max(60, Math.min(perf.browser_cache_ttl || 3600, 86400));
  return `public, max-age=${maxAge}`;
}
