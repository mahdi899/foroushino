'use client';

import NextImage, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { IMAGE_SIZES } from '@/lib/imageSizes';
import { primarySiteImageSrc, siteMediaFallbacks } from '@/lib/mediaUrl';
import { useLazyImages } from '@/components/performance/PerformanceProvider';
import { cn } from '@/lib/utils';

const disableImageOptimization = process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === '1';

export type AppImageProps = ImageProps & {
  wrapperClassName?: string;
};

/**
 * Site-wide image — native lazy loading (no double IntersectionObserver gate).
 * Use `priority` for above-the-fold LCP images only.
 */
export function AppImage({
  priority = false,
  loading,
  fetchPriority,
  decoding = 'async',
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  className,
  wrapperClassName,
  onLoad,
  onError,
  fill,
  sizes,
  src,
  ...props
}: AppImageProps) {
  const lazyImages = useLazyImages();
  const nativeLazy = !priority && lazyImages;
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const fallbacks = useMemo(() => {
    if (typeof src !== 'string') return [];
    const ordered = siteMediaFallbacks(src);
    const primary = primarySiteImageSrc(src);
    if (primary && !ordered.includes(primary)) {
      return [primary, ...ordered];
    }
    return ordered.length > 0 ? ordered : primary ? [primary] : [src];
  }, [src]);

  useEffect(() => {
    setFallbackIndex(0);
  }, [src]);

  const resolvedSrc =
    typeof src === 'string' ? (fallbacks[fallbackIndex] ?? primarySiteImageSrc(src) ?? src) : src;

  const unoptimized = disableImageOptimization;

  const handleImageError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setFallbackIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
      onError?.(event);
    },
    [fallbacks.length, onError],
  );

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      onLoad?.(event);
    },
    [onLoad],
  );

  const image = (
    <NextImage
      {...props}
      key={typeof resolvedSrc === 'string' ? resolvedSrc : undefined}
      src={resolvedSrc}
      fill={fill}
      sizes={sizes ?? (fill ? IMAGE_SIZES.fillDefault : undefined)}
      priority={priority}
      loading={priority ? undefined : nativeLazy ? 'lazy' : 'eager'}
      fetchPriority={priority ? 'high' : nativeLazy ? 'low' : 'auto'}
      decoding={decoding}
      placeholder="empty"
      unoptimized={unoptimized}
      className={cn(
        fill && 'object-cover',
        className,
      )}
      onLoad={handleLoad}
      onError={handleImageError}
    />
  );

  if (fill) {
    return (
      <span
        className={cn(
          'absolute inset-0 z-0 overflow-hidden',
          wrapperClassName,
        )}
      >
        {image}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'relative inline-block overflow-hidden',
        wrapperClassName,
      )}
    >
      {image}
    </span>
  );
}
