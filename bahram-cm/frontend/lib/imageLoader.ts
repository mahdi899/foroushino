import type { ImageLoaderProps } from 'next/image';
import { CDN_DELIVERY_ORIGIN } from '@/lib/mediaUrl';
import { mediaPathToStorage } from '@/lib/media/legacyMap';
import { MAX_IMAGE_DELIVERY_WIDTH } from '@/lib/imageSizes';
import { isImageOptimizationDisabled } from '@/lib/perfFlags';

const DELIVERY_ORIGIN = CDN_DELIVERY_ORIGIN;

/** Return canonical storage-backed URL for display. */
function rawPublicImageUrl(src: string): string {
  const ref = mediaPathToStorage(src);
  if (ref.startsWith('/storage/')) return ref;
  return src;
}

/** Extract `media/YYYY/MM/file.webp` from a portable or absolute storage URL. */
function extractStoragePath(src: string): string | null {
  const ref = mediaPathToStorage(src);
  if (ref.startsWith('/storage/media/')) {
    return ref.slice('/storage/'.length);
  }

  try {
    const parsed = new URL(src);
    if (parsed.pathname.startsWith('/storage/media/')) {
      return parsed.pathname.slice('/storage/'.length);
    }
    const fromPath = mediaPathToStorage(parsed.pathname);
    if (fromPath.startsWith('/storage/media/')) {
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

/**
 * Width-aware loader for Laravel media — resized variants via /cdn/media/… (no duplicate path segment).
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

  if (src.startsWith('/storage/') && width > 0) {
    const params = new URLSearchParams({
      w: String(cappedWidth(width)),
      q: String(quality ?? 80),
    });
    return `${DELIVERY_ORIGIN}/cdn/${src.slice('/storage/'.length)}?${params}`;
  }

  return resolveDisplayUrl(src);
}

function resolveDisplayUrl(src: string): string {
  const ref = mediaPathToStorage(src);
  if (ref.startsWith('/storage/media/')) {
    return ref;
  }
  return src;
}
