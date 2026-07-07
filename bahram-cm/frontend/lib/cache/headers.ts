import type { PublicPerfConfig } from './types';
import { CDN_HTML_SWR_MULTIPLIER, cdnHtmlMaxAge } from './cdnHeaders';

/** Build Cache-Control for public HTML document responses. */
export function buildPublicCacheControl(perf: PublicPerfConfig): string {
  if (perf.developer_mode || !perf.page_cache || !perf.browser_cache) {
    return 'no-store, must-revalidate';
  }

  const maxAge = cdnHtmlMaxAge(perf.browser_cache_ttl || 3600);
  return `public, max-age=${maxAge}, stale-while-revalidate=${maxAge * CDN_HTML_SWR_MULTIPLIER}`;
}

export function buildCdnCacheControl(perf: PublicPerfConfig): string | null {
  if (!perf.cdn_html_cache || perf.developer_mode || !perf.page_cache) return null;
  const maxAge = cdnHtmlMaxAge(perf.browser_cache_ttl || 3600);
  return `public, max-age=${maxAge}`;
}

export { CDN_MEDIA_EDGE, CDN_STATIC_IMMUTABLE } from './cdnHeaders';
