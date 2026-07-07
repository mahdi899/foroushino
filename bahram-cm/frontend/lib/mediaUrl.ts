import { API_ORIGIN, ASSET_ORIGIN, MEDIA_ORIGIN } from '@/lib/api/config';
import { siteConfig } from '@/config/site';
import { legacyPublicPathFromStorage, resolveLegacyStoragePath } from '@/lib/media/legacyMap';

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
 * Direct origin for /cdn/ resized delivery — bypasses Next.js middleware when set.
 * Set NEXT_PUBLIC_CDN_ORIGIN=http://127.0.0.1:8010 in dev for faster image bytes.
 */
export const CDN_DELIVERY_ORIGIN: string = (
  process.env.NEXT_PUBLIC_CDN_ORIGIN ||
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  process.env.NEXT_PUBLIC_ASSET_URL ||
  MEDIA_ORIGIN ||
  ASSET_ORIGIN ||
  API_ORIGIN
).replace(/\/+$/, '');

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

  const trimmed = url.trim();

  // Local dev without CDN: bundled assets live under Next `public/`.
  if (isDev && !MEDIA_ORIGIN) {
    if (trimmed.startsWith('/media/') || trimmed.startsWith('/images/')) {
      const mapped = resolveLegacyStoragePath(trimmed);
      if (mapped) return mapped;
      return trimmed;
    }
    if (trimmed.startsWith('/storage/')) {
      return legacyPublicPathFromStorage(trimmed) ?? trimmed;
    }
  }

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

/** Prefer bundled `/public/media` for imported site assets in admin thumbnails. */
function adminPublicAssetPath(ref: string | null | undefined): string | null {
  if (!ref?.trim()) return null;

  const trimmed = ref.trim();
  if (trimmed.startsWith('/media/') || trimmed.startsWith('/images/')) {
    return trimmed;
  }

  if (trimmed.startsWith('/storage/')) {
    return legacyPublicPathFromStorage(trimmed) ?? publicMediaFallbackFromStorage(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname.startsWith('/media/') || parsed.pathname.startsWith('/images/')) {
      return parsed.pathname;
    }
    if (parsed.pathname.startsWith('/storage/')) {
      return legacyPublicPathFromStorage(parsed.pathname) ?? publicMediaFallbackFromStorage(parsed.pathname);
    }
  } catch {
    /* ignore */
  }

  return publicMediaFallbackFromStorage(trimmed);
}

/** Normalize admin thumbnail URLs — same-origin, prefer public bundle for legacy site assets. */
export function normalizeAdminMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  const trimmed = url.trim();
  const publicAsset = adminPublicAssetPath(trimmed);
  if (publicAsset) return publicAsset;

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
        const fromPath = adminPublicAssetPath(parsed.pathname);
        if (fromPath) return fromPath;
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

  const addRaw = (candidate?: string | null) => {
    if (!candidate?.trim()) return;
    const value = candidate.trim();
    if (seen.has(value)) return;
    seen.add(value);
    out.push(value);
  };

  const addResolved = (candidate?: string | null) => {
    const normalized = normalizeAdminMediaUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  // 1. Next.js `/public` bundle — reliable for imported site SVGs/JPGs
  addRaw(item.legacyPath);
  addRaw(adminPublicAssetPath(item.persistSrc));
  addRaw(adminPublicAssetPath(item.src));

  // 2. Normalized display URL + storage/CDN copies
  addResolved(item.src);
  addResolved(item.persistSrc);

  // 3. Raw storage path for uploads without a public mirror
  if (item.persistSrc.startsWith('/storage/')) {
    addRaw(item.persistSrc);
  }

  return out;
}

/** When storage copy is missing, fall back to Next.js `/public/media/…` asset. */
function publicMediaFallbackFromStorage(ref: string | null | undefined): string | null {
  if (!ref?.trim()) return null;

  const normalized = ref.startsWith('/storage/') ? ref : persistMediaUrl(ref);
  if (!normalized?.startsWith('/storage/')) return null;

  const legacy = legacyPublicPathFromStorage(normalized);
  if (legacy) return legacy;

  const relative = normalized.replace(/^\/storage\/media\//, '');
  return `/media/${relative.replace(/^site\//, '')}`;
}

/** Best first URL for a site photo — CDN when mapped, otherwise local `/media`. */
export function primarySiteImageSrc(src: string | null | undefined): string {
  if (!src?.trim()) return '';
  const raw = src.trim();
  const mapped = resolveLegacyStoragePath(raw);
  if (mapped) return resolveMediaUrl(mapped);
  if (raw.startsWith('/storage/')) return resolveMediaUrl(raw);
  return raw;
}

/** Ordered fallbacks for public-site images (CDN when mapped → local bundle). */
export function siteMediaFallbacks(src: string | null | undefined): string[] {
  if (!src?.trim()) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (candidate?: string | null) => {
    if (!candidate?.trim() || seen.has(candidate)) return;
    seen.add(candidate);
    out.push(candidate);
  };

  const raw = src.trim();
  const mapped = resolveLegacyStoragePath(raw);

  // 0. Direct CDN delivery (gallery storage) — fastest when backend is up
  if (raw.startsWith('/storage/media/')) {
    add(`${CDN_DELIVERY_ORIGIN}/cdn/${raw.slice('/storage/'.length)}`);
    add(raw);
  }

  // 1. CDN/storage — actual file for imported site photos
  if (mapped) {
    add(`${CDN_DELIVERY_ORIGIN}/cdn/${mapped.slice('/storage/'.length)}`);
    add(resolveMediaUrl(mapped));
    add(mapped);
  }

  // 2. Local Next.js `/public` path
  if (raw.startsWith('/media/') || raw.startsWith('/images/')) {
    add(raw);
  }

  const persisted = persistMediaUrl(raw);
  if (persisted !== raw && !mapped) {
    add(resolveMediaUrl(persisted));
    add(persisted);
  }

  const legacyFromStorage = persisted.startsWith('/storage/')
    ? legacyPublicPathFromStorage(persisted)
    : null;
  if (legacyFromStorage) add(legacyFromStorage);

  const publicFallback = publicMediaFallbackFromStorage(persisted);
  if (publicFallback) add(publicFallback);

  if (raw.includes('portrait-founder') || persisted.includes('portrait-founder')) {
    add('/media/founder-portrait.svg');
  }
  if (raw.includes('signature.png') || persisted.includes('signature.png')) {
    add('/media/signature.svg');
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
