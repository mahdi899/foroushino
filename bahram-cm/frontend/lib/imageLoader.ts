import type { ImageLoaderProps } from 'next/image';
import { CDN_DELIVERY_ORIGIN } from '@/lib/mediaUrl';
import { legacyPublicPathFromStorage, resolveLegacyStoragePath } from '@/lib/media/legacyMap';
import { MAX_IMAGE_DELIVERY_WIDTH } from '@/lib/imageSizes';
import { isImageOptimizationDisabled } from '@/lib/perfFlags';

const DELIVERY_ORIGIN = CDN_DELIVERY_ORIGIN;

/** Return the original public asset URL — no resize, no WebP/AVIF conversion. */
function rawPublicImageUrl(src: string): string {
  if (src.startsWith('/media/') || src.startsWith('/images/')) {
    return src;
  }

  if (src.startsWith('/storage/')) {
    return legacyPublicPathFromStorage(src) ?? src;
  }

  const mapped = resolveLegacyStoragePath(src);
  if (mapped) {
    return legacyPublicPathFromStorage(mapped) ?? src;
  }

  try {
    const parsed = new URL(src);
    const fromPath = resolveLegacyStoragePath(parsed.pathname);
    if (fromPath) {
      return legacyPublicPathFromStorage(fromPath) ?? parsed.pathname;
    }
    if (parsed.pathname.startsWith('/media/') || parsed.pathname.startsWith('/images/')) {
      return parsed.pathname;
    }
  } catch {
    /* relative path */
  }

  return src;
}

/** Extract `media/YYYY/MM/file.webp` from a portable or absolute storage URL. */
function extractStoragePath(src: string): string | null {
  if (src.startsWith('/storage/media/')) {
    return src.slice('/storage/'.length);
  }

  const legacyMapped = resolveLegacyStoragePath(src);
  if (legacyMapped?.startsWith('/storage/media/')) {
    return legacyMapped.slice('/storage/'.length);
  }

  try {
    const parsed = new URL(src);
    if (parsed.pathname.startsWith('/storage/media/')) {
      return parsed.pathname.slice('/storage/'.length);
    }
    const fromPath = resolveLegacyStoragePath(parsed.pathname);
    if (fromPath?.startsWith('/storage/media/')) {
      return fromPath.slice('/storage/'.length);
    }
  } catch {
    /* relative or invalid — passthrough below */
  }

  return null;
}

function cappedWidth(width: number): number {
  return Math.min(Math.max(width, 0), MAX_IMAGE_DELIVERY_WIDTH);
}

/** Route local static assets through Next.js built-in optimizer. */
function nextOptimizedLocalUrl(src: string, width: number, quality: number): string {
  const params = new URLSearchParams({
    url: src,
    w: String(cappedWidth(width)),
    q: String(quality ?? 80),
  });
  return `/_next/image?${params}`;
}

function isLocalStaticAsset(src: string): boolean {
  return src.startsWith('/') && !src.startsWith('/storage/');
}

/**
 * Width-aware loader for Laravel media — resized variants via /cdn/media/… (no duplicate path segment).
 * Local /images/* and /icons/* use the Next.js image optimizer.
 */
export default function bahramImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (isImageOptimizationDisabled()) {
    return rawPublicImageUrl(src);
  }

  const storagePath = extractStoragePath(src);

  if (storagePath && width > 0) {
    const params = new URLSearchParams({
      w: String(cappedWidth(width)),
      q: String(quality ?? 80),
    });
    return `${DELIVERY_ORIGIN}/cdn/${storagePath}?${params}`;
  }

  if (isLocalStaticAsset(src) && width > 0) {
    return nextOptimizedLocalUrl(src, width, quality ?? 80);
  }

  return src;
}
