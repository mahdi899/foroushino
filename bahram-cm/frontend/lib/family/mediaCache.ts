const CACHE_NAME = 'family-media-v3';

const blobUrlByKey = new Map<string, string>();

/**
 * Cache API only accepts http(s) request keys. Encode kind/mediaId/url into a
 * same-origin path so put/match don't throw (and wipe a successful fetch).
 */
function cacheRequest(kind: 'preview' | 'full', mediaId: number, url: string): Request {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost';
  const keyUrl = `${origin}/__family-media-cache__/${kind}/${mediaId}?u=${encodeURIComponent(url)}`;
  return new Request(keyUrl);
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
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
        headers: { 'Content-Type': blob.type || 'application/octet-stream' },
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

/** Best-effort cache write; returns blob when fetch succeeds (same-origin / CORS). */
export async function tryCacheFamilyMediaBlob(
  url: string,
  mediaId: number,
  kind: 'preview' | 'full',
  mimeType?: string | null,
): Promise<Blob | null> {
  const cached = await readFamilyMediaBlob(kind, mediaId, url);
  if (cached) return withPreferredMimeType(cached, mimeType);

  try {
    const sameOrigin =
      url.startsWith('/') ||
      (typeof window !== 'undefined' && new URL(url, window.location.origin).origin === window.location.origin);

    const response = await fetch(url, {
      mode: 'cors',
      credentials: sameOrigin ? 'same-origin' : 'omit',
      cache: 'default',
    });
    if (!response.ok) return null;
    const blob = withPreferredMimeType(await response.blob(), mimeType);
    // Persist after we already have the blob — write failures must not drop playback.
    void writeFamilyMediaBlob(kind, mediaId, url, blob);
    return blob;
  } catch {
    return null;
  }
}

function withPreferredMimeType(blob: Blob, mimeType?: string | null): Blob {
  const preferred = mimeType?.trim();
  if (!preferred || preferred === 'application/octet-stream') return blob;
  if (blob.type && blob.type !== 'application/octet-stream') return blob;
  return new Blob([blob], { type: preferred });
}
