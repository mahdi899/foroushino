import type { ImageLoaderProps } from 'next/image';
import { primarySiteImageSrc } from '@/lib/mediaUrl';

/**
 * Next.js custom image loader — returns the canonical raw path only.
 * Never rewrites to /cdn/media or appends ?w= / ?q= query params.
 * See docs/MEDIA-URL-POLICY.md
 */
export default function bahramImageLoader({ src }: ImageLoaderProps): string {
  if (typeof src !== 'string' || !src.trim()) {
    return typeof src === 'string' ? src : '';
  }
  return primarySiteImageSrc(src) || src;
}
