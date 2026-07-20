import {
  familyMediaPathname,
  isFamilyMediaSameOriginHost,
  normalizeFamilyGalleryMediaPath,
  resolveFamilyMediaPlaybackUrl,
} from '@/lib/family/mediaPlaybackUrl';

/** Browser Cache API retention after a media item is viewed. */
export const FAMILY_MEDIA_CACHE_TTL_MS = 3 * 24 * 60 * 60 * 1000;

const CACHE_NAME = 'family-media-v5';
const CACHED_AT_HEADER = 'X-Family-Media-Cached-At';

const blobUrlByKey = new Map<string, string>();

export type FamilyMediaCacheKind = 'image' | 'video' | 'voice' | 'preview' | 'full';

/**
 * Cache API only accepts http(s) request keys. Encode kind/mediaId/url into a
 * same-origin path so put/match don't throw (and wipe a successful fetch).
 */
function cacheRequest(kind: 'preview' | 'full', mediaId: number, url: string): Request {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const keyUrl = `${origin}/__family-media-cache__/${kind}/${mediaId}?u=${encodeURIComponent(url)}`;
  return new Request(keyUrl);
}

/** Offline cache prefetch — disabled in dev (CDN-only; no /storage noise in console). */
function shouldPrefetchFamilyMedia(): boolean {
  return process.env.NODE_ENV === 'production';
}

function isFamilyCdnProxyPath(pathname: string): boolean {
  if (pathname.startsWith('/storage/')) return false;
  return normalizeFamilyGalleryMediaPath(pathname).startsWith('/media/family/');
}

/** Only same-origin /media/family/* proxy — never /storage or cross-origin CDN fetch. */
function isAllowedFamilyMediaCacheFetch(fetchUrl: string): boolean {
  if (fetchUrl.includes('/storage/media/')) return false;
  try {
    const resolved = new URL(fetchUrl, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (typeof window !== 'undefined' && resolved.origin !== window.location.origin) return false;
    return isFamilyCdnProxyPath(resolved.pathname);
  } catch {
    return false;
  }
}

/** Same-origin /media/family/* proxy avoids CORS when persisting CDN media in Cache API. */
export function familyMediaCacheFetchUrl(streamUrl: string): string {
  if (typeof window === 'undefined') return streamUrl;

  const canonical = resolveFamilyMediaPlaybackUrl(streamUrl) ?? streamUrl;

  if (isFamilyMediaSameOriginHost(window.location.hostname)) {
    try {
      const parsed = new URL(canonical, window.location.origin);
      const mediaPath = familyMediaPathname(parsed.pathname);
      if (mediaPath && isFamilyCdnProxyPath(mediaPath)) {
        return `${window.location.origin}${normalizeFamilyGalleryMediaPath(mediaPath)}${parsed.search}`;
      }
    } catch {
      // fall through — return canonical CDN URL (cross-origin; caller skips fetch).
    }
  }

  // Never fall back to raw /storage refs — gallery files are on CDN, not Next.js.
  return canonical;
}

function isFresh(response: Response): boolean {
  const cachedAt = response.headers.get(CACHED_AT_HEADER);
  if (!cachedAt) return true;
  const age = Date.now() - Number(cachedAt);
  return Number.isFinite(age) && age >= 0 && age < FAMILY_MEDIA_CACHE_TTL_MS;
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

export async function pruneExpiredFamilyMediaCache(): Promise<void> {
  const cache = await openCache();
  if (!cache) return;

  try {
    const keys = await cache.keys();
    await Promise.all(
      keys.map(async (request) => {
        const response = await cache.match(request);
        if (response && !isFresh(response)) {
          await cache.delete(request);
        }
      }),
    );
  } catch {
    // best-effort
  }
}

export async function readFamilyMediaBlob(
  kind: 'preview' | 'full',
  mediaId: number,
  url: string,
): Promise<Blob | null> {
  const cache = await openCache();
  if (!cache) return null;
  try {
    const response = await cache.match(cacheRequest(kind, mediaId, url));
    if (!response) return null;
    if (!isFresh(response)) {
      await cache.delete(cacheRequest(kind, mediaId, url));
      return null;
    }
    return response.blob();
  } catch {
    return null;
  }
}

export async function writeFamilyMediaBlob(
  kind: 'preview' | 'full',
  mediaId: number,
  url: string,
  blob: Blob,
): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  try {
    await cache.put(
      cacheRequest(kind, mediaId, url),
      new Response(blob, {
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
          [CACHED_AT_HEADER]: String(Date.now()),
        },
      }),
    );
  } catch {
    // Cache is best-effort — never fail playback because put() rejected.
  }
}

export function getFamilyMediaBlobUrl(key: string, blob: Blob): string {
  const existing = blobUrlByKey.get(key);
  if (existing) return existing;
  const next = URL.createObjectURL(blob);
  blobUrlByKey.set(key, next);
  return next;
}

function guessFilename(url: string): string {
  try {
    const pathname = new URL(url, 'https://cdn.local').pathname;
    const base = pathname.split('/').pop();
    if (base && base.includes('.')) return base;
  } catch {
    // ignore
  }
  return 'media';
}

/** Cached blob URL when fresh — null when streaming from network is required. */
export async function getCachedFamilyMediaObjectUrl(
  url: string,
  mediaId: number,
): Promise<string | null> {
  const canonical = resolveFamilyMediaPlaybackUrl(url) ?? url;
  if (!canonical) return null;
  const blob = await readFamilyMediaBlob('full', mediaId, canonical);
  if (!blob) return null;
  return getFamilyMediaBlobUrl(`view:${mediaId}:${canonical}`, blob);
}

/** Best-effort cache write; returns blob when fetch succeeds (same-origin / CORS). */
export async function tryCacheFamilyMediaBlob(
  url: string,
  mediaId: number,
  kind: 'preview' | 'full',
  mimeType?: string | null,
): Promise<Blob | null> {
  if (!shouldPrefetchFamilyMedia()) return null;

  const canonical = resolveFamilyMediaPlaybackUrl(url) ?? url;
  if (!canonical || canonical.includes('/storage/media/')) return null;

  const cached = await readFamilyMediaBlob(kind, mediaId, canonical);
  if (cached) return withPreferredMimeType(cached, mimeType);

  const fetchUrl = familyMediaCacheFetchUrl(canonical);

  if (!isAllowedFamilyMediaCacheFetch(fetchUrl)) return null;

  try {
    const resolved = new URL(fetchUrl, window.location.origin);

    const response = await fetch(fetchUrl, {
      mode: 'cors',
      credentials: 'same-origin',
      cache: 'force-cache',
    });
    if (!response.ok) return null;
    const blob = withPreferredMimeType(await response.blob(), mimeType);
    void writeFamilyMediaBlob(kind, mediaId, canonical, blob);
    return blob;
  } catch {
    return null;
  }
}

/** Fire-and-forget local cache after the user opens/views media. */
export function rememberFamilyMediaView(
  url: string,
  mediaId: number,
  kind: Exclude<FamilyMediaCacheKind, 'preview' | 'full'>,
  mimeType?: string | null,
): void {
  if (!shouldPrefetchFamilyMedia()) return;

  const canonical = resolveFamilyMediaPlaybackUrl(url) ?? url;
  if (!canonical || canonical.includes('/storage/media/')) return;

  // Images already stream from CDN via <img> — prefetch would hit legacy /storage paths.
  if (kind === 'image') return;

  const persist = () => {
    void tryCacheFamilyMediaBlob(canonical, mediaId, 'full', mimeType);
  };

  // Voice/video stream via Range — defer full-file cache so it never steals bandwidth.
  if (kind === 'voice' || kind === 'video') {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(persist, { timeout: 90_000 });
    } else if (typeof window !== 'undefined') {
      window.setTimeout(persist, 20_000);
    }
    return;
  }

  persist();
}

export async function downloadFamilyMedia(
  url: string,
  mediaId: number,
  filename?: string,
): Promise<void> {
  if (typeof document === 'undefined') return;

  let blob = await readFamilyMediaBlob('full', mediaId, url);
  if (!blob) {
    blob = await tryCacheFamilyMediaBlob(url, mediaId, 'full');
  }

  const name = filename ?? guessFilename(url);
  const anchor = document.createElement('a');
  anchor.rel = 'noopener';

  if (blob) {
    anchor.href = getFamilyMediaBlobUrl(`download:${mediaId}:${url}`, blob);
    anchor.download = name;
  } else {
    anchor.href = url;
    anchor.target = '_blank';
    anchor.download = name;
  }

  anchor.click();
}

function withPreferredMimeType(blob: Blob, mimeType?: string | null): Blob {
  const preferred = mimeType?.trim();
  if (!preferred || preferred === 'application/octet-stream') return blob;
  if (blob.type && blob.type !== 'application/octet-stream') return blob;
  return new Blob([blob], { type: preferred });
}

if (typeof window !== 'undefined') {
  void pruneExpiredFamilyMediaCache();
}
