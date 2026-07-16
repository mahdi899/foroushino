const CACHE_NAME = 'family-media-v2';

const blobUrlByKey = new Map<string, string>();

function cacheKey(kind: 'preview' | 'full', mediaId: number, url: string): string {
  return `${kind}:${mediaId}:${url}`;
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
  const response = await cache.match(cacheKey(kind, mediaId, url));
  if (!response) return null;
  return response.blob();
}

export async function writeFamilyMediaBlob(
  kind: 'preview' | 'full',
  mediaId: number,
  url: string,
  blob: Blob,
): Promise<void> {
  const cache = await openCache();
  if (!cache) return;
  await cache.put(
    cacheKey(kind, mediaId, url),
    new Response(blob, {
      headers: { 'Content-Type': blob.type || 'application/octet-stream' },
    }),
  );
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
): Promise<Blob | null> {
  const cached = await readFamilyMediaBlob(kind, mediaId, url);
  if (cached) return cached;

  try {
    const response = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'default' });
    if (!response.ok) return null;
    const blob = await response.blob();
    await writeFamilyMediaBlob(kind, mediaId, url, blob);
    return blob;
  } catch {
    return null;
  }
}
