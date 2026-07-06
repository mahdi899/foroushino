import type { ImageLoaderProps } from 'next/image';
import { API_ORIGIN, ASSET_ORIGIN, MEDIA_ORIGIN } from '@/lib/api/config';
import { MAX_IMAGE_DELIVERY_WIDTH } from '@/lib/imageSizes';

const DELIVERY_ORIGIN = (MEDIA_ORIGIN || ASSET_ORIGIN || API_ORIGIN).replace(/\/+$/, '');

/** Extract `media/YYYY/MM/file.webp` from a portable or absolute storage URL. */
function extractStoragePath(src: string): string | null {
  if (src.startsWith('/storage/media/')) {
    return src.slice('/storage/'.length);
  }

  try {
    const parsed = new URL(src);
    if (parsed.pathname.startsWith('/storage/media/')) {
      return parsed.pathname.slice('/storage/'.length);
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
    q: String(quality ?? 85),
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
  const storagePath = extractStoragePath(src);

  if (storagePath && width > 0) {
    const params = new URLSearchParams({
      w: String(cappedWidth(width)),
      q: String(quality ?? 85),
    });
    return `${DELIVERY_ORIGIN}/cdn/${storagePath}?${params}`;
  }

  if (isLocalStaticAsset(src) && width > 0) {
    return nextOptimizedLocalUrl(src, width, quality ?? 85);
  }

  return src;
}
