import type { ImageLoaderProps } from 'next/image';
import { primarySiteImageSrc } from '@/lib/mediaUrl';

/**
 * Next.js custom image loader — returns raw `/storage/...` paths only.
 * No resize query params (`?w=`, `?q=`) — see docs/MEDIA-URL-POLICY.md
 */
export default function bahramImageLoader({ src }: ImageLoaderProps): string {
  if (typeof src !== 'string' || !src.trim()) {
    return typeof src === 'string' ? src : '';
  }

  return primarySiteImageSrc(src) || src;
}
