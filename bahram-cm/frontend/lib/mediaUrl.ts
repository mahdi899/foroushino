import { API_ORIGIN, ASSET_ORIGIN, MEDIA_ORIGIN } from '@/lib/api/config';
import { siteConfig } from '@/config/site';
import { resolveLegacyStoragePath } from '@/lib/media/legacyMap';

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/+$/, '');
}

function storagePathFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.pathname.startsWith('/storage/')) {
      return parsed.pathname.replace(/^\/storage\//, '');
    }
  } catch {
    /* ignore */
  }
  return null;
}

function unwrapNextImageProxy(url: string): string | null {
  if (!url.includes('_next/image')) return url;
  try {
    const parsed = new URL(url, siteOrigin());
    const inner = parsed.searchParams.get('url');
    return inner ? decodeURIComponent(inner) : null;
  } catch {
    return null;
  }
}

function normalizeAbsoluteStorage(url: string): string {
  try {
    const parsed = new URL(url);
    if (!parsed.pathname.startsWith('/storage/')) return url;
    const isLocal =
      parsed.hostname === 'localhost' ||
      parsed.hostname === '127.0.0.1' ||
      (parsed.hostname === 'localhost' && !parsed.port);
    if (isLocal) {
      return `${MEDIA_ORIGIN || ASSET_ORIGIN}${parsed.pathname}`;
    }
    if (MEDIA_ORIGIN) {
      return `${MEDIA_ORIGIN}${parsed.pathname}`;
    }
  } catch {
    /* keep */
  }
  return url;
}

const isDev = process.env.NODE_ENV === 'development';

/** Origin for a portable reference path. */
function originForReference(ref: string): string | null {
  if (MEDIA_ORIGIN) return MEDIA_ORIGIN;
  if (ref.startsWith('/storage/')) return ASSET_ORIGIN;
  return null;
}

/**
 * Portable path for DB / HTML — never store absolute CDN URLs.
 * Mirrors backend `App\Support\MediaUrl::reference()`.
 */
export function persistMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  let trimmed = url.trim();
  const unwrapped = unwrapNextImageProxy(trimmed);
  if (!unwrapped) return '';
  trimmed = unwrapped;

  if (trimmed.startsWith('/images/') || trimmed.startsWith('/media/')) {
    return resolveLegacyStoragePath(trimmed) ?? trimmed;
  }

  if (trimmed.startsWith('/api/files/')) {
    return `/storage/${trimmed.replace(/^\/api\/files\//, '')}`;
  }

  if (trimmed.startsWith('/storage/')) return trimmed;

  const storagePath = storagePathFromUrl(trimmed);
  if (storagePath) return `/storage/${storagePath}`;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/storage/')) return parsed.pathname;
      if (parsed.pathname.startsWith('/images/')) return parsed.pathname;
    } catch {
      /* keep */
    }
    return trimmed;
  }

  if (trimmed.startsWith('/')) return trimmed;

  return `/storage/${trimmed.replace(/^\/+/, '')}`;
}

/** Alias for persistMediaUrl — same naming as backend. */
export const mediaReference = persistMediaUrl;

/**
 * Public display URL — direct fetch, no Next.js proxy.
 * Mirrors backend `App\Support\MediaUrl::resolve()`.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  const ref = persistMediaUrl(url);
  if (!ref) return '';

  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return normalizeAbsoluteStorage(ref);
  }

  if (ref.startsWith('/images/') || ref.startsWith('/media/')) {
    // Dev: serve from Next public when unmapped. Prod: unified storage/CDN.
    const mapped = resolveLegacyStoragePath(ref);
    if (mapped) {
      const mappedOrigin = originForReference(mapped);
      if (mappedOrigin) return `${mappedOrigin}${mapped}`;
    }
    if (isDev && !MEDIA_ORIGIN && ref.startsWith('/media/')) return ref;
    if (MEDIA_ORIGIN) return `${MEDIA_ORIGIN}${ref}`;
    return ref;
  }

  if (ref.startsWith('/storage/')) {
    if (isDev && !MEDIA_ORIGIN) return ref;
    if (MEDIA_ORIGIN) return `${MEDIA_ORIGIN}${ref}`;
    return ref;
  }

  const origin = originForReference(ref);
  if (origin) return `${origin}${ref}`;

  return ref;
}

/** Normalize admin thumbnail URLs — always same-origin /storage in dev (never 127.0.0.1:8010). */
export function normalizeAdminMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  const trimmed = url.trim();
  if (trimmed.startsWith('/')) {
    return resolveMediaUrl(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/storage/') || parsed.pathname.startsWith('/media/') || parsed.pathname.startsWith('/images/')) {
      const local =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1';
      if (local) {
        return resolveMediaUrl(parsed.pathname);
      }
    }
  } catch {
    /* fall through */
  }

  return resolveMediaUrl(trimmed);
}

/** Build ordered fallback URLs for admin gallery thumbnails. */
export function adminMediaThumbFallbacks(item: {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (candidate?: string | null) => {
    const normalized = normalizeAdminMediaUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  add(item.src);
  add(resolveMediaUrl(item.persistSrc));
  if (item.legacyPath) {
    add(item.legacyPath);
    add(resolveMediaUrl(item.legacyPath));
  }

  return out;
}

export function rewriteArticleBodyMediaUrls(html: string): string {
  if (!html) return html;

  return html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (_match, pre, src, post) => `${pre}${resolveMediaUrl(src)}${post}`,
  );
}

/**
 * Canonical absolute URL for sitemap, Open Graph, JSON-LD, and crawlers.
 */
export function resolveSitemapImageUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  const resolved = resolveMediaUrl(url);
  if (!resolved) return '';
  if (resolved.startsWith('http://') || resolved.startsWith('https://')) return resolved;
  if (resolved.startsWith('/')) return `${siteOrigin()}${resolved}`;
  return resolved;
}

/** Effective public base for uploads (CDN or Laravel). */
export function uploadOrigin(): string {
  return MEDIA_ORIGIN || ASSET_ORIGIN;
}

/** @deprecated Use persistMediaUrl for article/cover saves. */
export function toStorageAbsoluteUrl(url: string): string {
  return resolveMediaUrl(persistMediaUrl(url));
}
