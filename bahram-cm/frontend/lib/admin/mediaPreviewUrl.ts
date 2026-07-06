/** Rewrite optimize preview URLs to the current site origin (Next.js proxies /api/v1 to Laravel). */
export function rewriteOptimizePreviewUrl(url: string): string {
  if (!url) return url;
  if (typeof window === 'undefined') return url;

  try {
    const parsed = new URL(url, window.location.origin);
    const local = new URL(window.location.origin);
    parsed.protocol = local.protocol;
    parsed.host = local.host;
    return parsed.toString();
  } catch {
    if (url.startsWith('/')) return `${window.location.origin}${url}`;
    return url;
  }
}
