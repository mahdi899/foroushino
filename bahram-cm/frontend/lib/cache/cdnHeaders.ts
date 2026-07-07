/** Shared CDN cache header values (browser + Cloudflare edge). */

export const CDN_STATIC_MAX_AGE = 31_536_000; // 1 year

export const CDN_STATIC_IMMUTABLE = `public, max-age=${CDN_STATIC_MAX_AGE}, immutable`;

export const CDN_MEDIA_EDGE = `public, max-age=${CDN_STATIC_MAX_AGE}, immutable`;

export const CDN_HTML_SWR_MULTIPLIER = 2;

/** Edge TTL for HTML when cdn_html_cache is enabled (seconds). */
export function cdnHtmlMaxAge(browserTtl: number): number {
  return Math.max(60, Math.min(browserTtl || 3600, 86_400));
}

/** Whether proxied path is long-cache media. */
export function isLongCacheMediaPath(pathname: string): boolean {
  return pathname.startsWith('/cdn/') || pathname.startsWith('/storage/media/');
}
