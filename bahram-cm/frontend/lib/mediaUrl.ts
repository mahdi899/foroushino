import { API_ORIGIN, ASSET_ORIGIN, MEDIA_ORIGIN } from '@/lib/api/config';
import { siteConfig } from '@/config/site';
import { mediaPathToStorage } from '@/lib/media/legacyMap';

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

function cdnPathFromStorageRef(ref: string): string {
  if (ref.startsWith('/storage/media/')) return ref.slice('/storage'.length)
  return ref
}

function usesCdnDelivery(ref: string): boolean {
  return ref.startsWith('/storage/media/')
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
      const ref = parsed.pathname
      return usesCdnDelivery(ref)
        ? `${MEDIA_ORIGIN}${cdnPathFromStorageRef(ref)}`
        : `${siteOrigin()}${ref}`
    }
  } catch {
    /* keep */
  }
  return url;
}

/** Origin for a portable reference path. */
function originForReference(ref: string): string | null {
  if (MEDIA_ORIGIN) return MEDIA_ORIGIN;
  if (ref.startsWith('/storage/')) return ASSET_ORIGIN;
  return null;
}

/**
 * Optional direct backend origin for preconnect hints (MediaPreconnect).
 * NOT used for image URL rewriting — images always use raw `/storage/...` paths.
 * See docs/MEDIA-URL-POLICY.md
 */
export const CDN_DELIVERY_ORIGIN: string = (
  process.env.NEXT_PUBLIC_CDN_ORIGIN ||
  process.env.NEXT_PUBLIC_MEDIA_URL ||
  process.env.NEXT_PUBLIC_ASSET_URL ||
  MEDIA_ORIGIN ||
  ASSET_ORIGIN ||
  API_ORIGIN
).replace(/\/+$/, '');

function canonicalStorageRef(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  let trimmed = url.trim();
  const unwrapped = unwrapNextImageProxy(trimmed);
  if (!unwrapped) return '';
  trimmed = unwrapped;
  return mediaPathToStorage(trimmed);
}

function isSvgMediaRef(ref: string): boolean {
  return /\.svg(\?|#|$)/i.test(ref);
}

/** Portable `/storage/...` reference for admin gallery URLs (incl. `/cdn/` delivery paths). */
function adminStorageRef(url: string | null | undefined): string {
  const ref = canonicalStorageRef(url);
  if (ref.startsWith('/storage/')) return ref;
  return persistMediaUrl(url);
}

function stripDeliveryQuery(url: string): string {
  try {
    const parsed = new URL(url, siteOrigin());
    if (!parsed.searchParams.has('w') && !parsed.searchParams.has('q')) {
      return url;
    }
    parsed.searchParams.delete('w');
    parsed.searchParams.delete('q');
    const query = parsed.searchParams.toString();
    return `${parsed.pathname}${query ? `?${query}` : ''}${parsed.hash}`;
  } catch {
    return url.replace(/([?&])(w|q)=[^&]*/g, '').replace(/\?$/, '');
  }
}

/** Normalize any stored or legacy delivery URL to a plain /storage reference. */
export function normalizeImageSrc(url: string | null | undefined): string {
  if (!url?.trim()) return '';
  return persistMediaUrl(stripDeliveryQuery(url.trim()));
}

/**
 * Portable path for DB / HTML — never store absolute CDN URLs or legacy `/media/*`.
 * Mirrors backend `App\Support\MediaUrl::reference()`.
 */
export function persistMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  let trimmed = url.trim();
  const unwrapped = unwrapNextImageProxy(trimmed);
  if (!unwrapped) return '';
  trimmed = unwrapped;

  if (trimmed.startsWith('/api/files/')) {
    return `/storage/${trimmed.replace(/^\/api\/files\//, '')}`;
  }

  if (trimmed.startsWith('/storage/')) {
    return trimmed.replace(/\/storage\/storage\//g, '/storage/');
  }

  if (trimmed.startsWith('/cdn/media/')) {
    return trimmed.replace(/^\/cdn\//, '/storage/');
  }

  const storagePath = storagePathFromUrl(trimmed);
  if (storagePath) return `/storage/${storagePath}`;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith('/storage/')) return parsed.pathname;
      if (parsed.pathname.startsWith('/cdn/media/')) {
        return parsed.pathname.replace(/^\/cdn\//, '/storage/');
      }
      if (parsed.pathname.startsWith('/media/') || parsed.pathname.startsWith('/images/')) {
        return mediaPathToStorage(parsed.pathname);
      }
    } catch {
      /* keep */
    }
    return trimmed;
  }

  if (trimmed.startsWith('/')) {
    return mediaPathToStorage(trimmed);
  }

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

  if (ref.startsWith('/api/admin/media/')) {
    return ref;
  }

  if (ref.startsWith('/storage/')) {
    if (MEDIA_ORIGIN && usesCdnDelivery(ref)) {
      return `${MEDIA_ORIGIN}${cdnPathFromStorageRef(ref)}`
    }
    if (MEDIA_ORIGIN) {
      return `${siteOrigin()}${ref}`
    }
    return ref
  }

  const origin = originForReference(ref);
  if (origin) return `${origin}${ref}`;

  return ref;
}

const LOCAL_MEDIA_DISKS = new Set(['public', 'local']);

/** True when the file is stored on the download host (FTP/SFTP), not local public disk. */
export function isAdminMediaOnRemoteHost(item: {
  isRemote?: boolean | null;
  disk?: string | null;
}): boolean {
  if (item.isRemote === true) return true;

  const disk = item.disk?.trim();
  if (!disk) return false;

  return !LOCAL_MEDIA_DISKS.has(disk);
}

/** Normalize admin thumbnail URLs — same-origin gallery storage via Next proxy. */
export function normalizeAdminMediaUrl(url: string | null | undefined): string {
  if (!url?.trim()) return '';

  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/api/admin/media/')) {
    return trimmed;
  }

  const ref = adminStorageRef(url);
  if (ref.startsWith('/storage/')) return ref;

  const persisted = persistMediaUrl(url);
  if (persisted.startsWith('/storage/')) return persisted;

  return ref || persisted;
}

/** Open-in-new-tab URL for admin gallery / edit modal. */
export function adminMediaOpenUrl(item: {
  id: number;
  url: string;
  persistSrc: string;
  isRemote?: boolean | null;
  disk?: string | null;
}): string {
  if (isAdminMediaOnRemoteHost(item)) {
    const normalized = normalizeAdminMediaUrl(item.url);
    if (
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('/api/admin/media/')
    ) {
      return normalized;
    }
    return `/api/admin/media/${item.id}/file`;
  }

  return resolveMediaUrl(item.url || item.persistSrc);
}

/** Build ordered fallback URLs for admin gallery thumbnails. */
export function adminMediaThumbFallbacks(item: {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  isRemote?: boolean | null;
  disk?: string | null;
}): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (candidate?: string | null) => {
    const normalized = normalizeAdminMediaUrl(candidate);
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  };

  const ref = adminStorageRef(item.persistSrc || item.src || item.legacyPath);
  const remoteLike =
    isAdminMediaOnRemoteHost({ isRemote: item.isRemote, disk: item.disk }) ||
    item.src.startsWith('http://') ||
    item.src.startsWith('https://') ||
    item.src.startsWith('/api/admin/media/');

  if (remoteLike) {
    add(item.src);
  } else if (ref.startsWith('/storage/media/')) {
    add(ref);
  }

  if (!remoteLike) {
    add(item.persistSrc);
    add(item.src);
    add(item.legacyPath);
  } else {
    add(item.persistSrc);
    add(item.legacyPath);
  }

  return out;
}

/** Best first URL for a site photo — CDN when MEDIA_ORIGIN is set, else same-origin `/storage/...`. */
export function primarySiteImageSrc(src: string | null | undefined): string {
  if (!src?.trim()) return '';
  const ref = normalizeImageSrc(src);
  if (!ref) return src.trim();
  if (ref.startsWith('/storage/')) {
    if (MEDIA_ORIGIN && usesCdnDelivery(ref)) {
      return `${MEDIA_ORIGIN}${cdnPathFromStorageRef(ref)}`;
    }
    return ref;
  }
  return resolveMediaUrl(ref) || ref;
}

/** Known alternates when a canonical site asset is missing or fails to load. */
const SITE_ASSET_FALLBACKS: Record<string, string[]> = {
  '/storage/media/site/portrait-founder.webp': [
    '/storage/media/site/portrait-founder.jpg',
    '/storage/media/site/manifesto-portrait-a.jpg',
    '/storage/media/site/founder-portrait.svg',
  ],
  '/storage/media/site/portrait-founder-mobile.webp': [
    '/storage/media/site/portrait-founder.webp',
    '/storage/media/site/portrait-founder.jpg',
  ],
  '/storage/media/site/campaign-writing-hero-mobile.webp': [
    '/storage/media/site/landscape-session.webp',
    '/storage/media/site/landscape-session.jpg',
  ],
  '/storage/media/site/signature.png': [
    '/storage/media/site/signature.svg',
  ],
};

/** Ordered fallbacks for public-site images (storage → resolved origin). */
export function siteMediaFallbacks(src: string | null | undefined): string[] {
  if (!src?.trim()) return [];

  const seen = new Set<string>();
  const out: string[] = [];
  const add = (candidate?: string | null) => {
    if (!candidate?.trim() || seen.has(candidate)) return;
    seen.add(candidate);
    out.push(candidate);
  };

  const ref = normalizeImageSrc(src);
  if (!ref) return [src.trim()];

  if (ref.startsWith('/storage/')) {
    add(ref);
    for (const extra of SITE_ASSET_FALLBACKS[ref] ?? []) {
      add(extra);
    }
    return out;
  }

  add(ref);
  add(resolveMediaUrl(ref));

  return out.length > 0 ? out : [src.trim()];
}

/** Public display URL for `<img src>` — always same-origin `/storage/...` when possible. */
export const mediaDisplaySrc = primarySiteImageSrc;

export function rewriteArticleBodyMediaUrls(html: string): string {
  if (!html) return html;

  let out = html.replace(
    /(<img\b[^>]*\bsrc=["'])([^"']+)(["'])/gi,
    (_match, pre, src, post) => `${pre}${primarySiteImageSrc(src)}${post}`,
  );

  // Unwrap legacy stored `/_next/image?url=...` references anywhere in HTML.
  out = out.replace(/\/_next\/image\?url=([^"'&>\s]+)/gi, (_match, encoded: string) => {
    try {
      return primarySiteImageSrc(decodeURIComponent(encoded));
    } catch {
      return _match;
    }
  });

  return out;
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
