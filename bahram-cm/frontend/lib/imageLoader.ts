import type { ImageLoaderProps } from 'next/image';
import { CDN_DELIVERY_ORIGIN, primarySiteImageSrc } from '@/lib/mediaUrl';

/**
 * Next.js custom image loader — routes storage assets through Laravel CDN resize.
 * SVG and external URLs are served as-is.
 */
export default function bahramImageLoader({ src, width, quality }: ImageLoaderProps): string {
  if (typeof src !== 'string' || !src.trim()) {
    return typeof src === 'string' ? src : '';
  }

  const resolved = primarySiteImageSrc(src) || src;

  if (/\.svg(\?|#|$)/i.test(resolved)) {
    return resolved;
  }

  if (resolved.startsWith('http://') || resolved.startsWith('https://')) {
    return appendResizeParams(resolved, width, quality ?? 85);
  }

  if (resolved.startsWith('/storage/')) {
    const diskPath = resolved.replace(/^\/storage\//, '');
    const deliveryPath = `/cdn/${diskPath}`;
    const origin = CDN_DELIVERY_ORIGIN.replace(/\/+$/, '');
    const base = origin ? `${origin}${deliveryPath}` : deliveryPath;
    return appendResizeParams(base, width, quality ?? 85);
  }

  return resolved;
}

function appendResizeParams(url: string, width: number, quality: number): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}w=${width}&q=${quality}`;
}
