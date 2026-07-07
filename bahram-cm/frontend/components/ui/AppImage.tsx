'use client';

import NextImage, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GRAY_BLUR_DATA_URL } from '@/lib/imagePlaceholder';
import { IMAGE_SIZES } from '@/lib/imageSizes';
import { primarySiteImageSrc, siteMediaFallbacks } from '@/lib/mediaUrl';
import { useLazyImages } from '@/components/performance/PerformanceProvider';
import { cn } from '@/lib/utils';

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
  placeholder,
  blurDataURL,
  className,
  wrapperClassName,
  onLoad,
  fill,
  sizes,
  src,
  ...props
}: AppImageProps) {
  const lazyImages = useLazyImages();
  const nativeLazy = !priority && lazyImages;
  const [loaded, setLoaded] = useState(priority);
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
    setLoaded(false);
  }, [src]);

  const resolvedSrc =
    typeof src === 'string' ? (fallbacks[fallbackIndex] ?? primarySiteImageSrc(src) ?? src) : src;

  const handleImageError = useCallback(() => {
    setLoaded(false);
    setFallbackIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
  }, [fallbacks.length]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setLoaded(true);
      onLoad?.(event);
    },
    [onLoad],
  );

  const useBlur = !priority && placeholder !== 'empty';
  const showPlaceholder = !priority && !loaded && nativeLazy;

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
      placeholder={useBlur ? 'blur' : 'empty'}
      blurDataURL={useBlur ? (blurDataURL ?? GRAY_BLUR_DATA_URL) : undefined}
      className={cn(
        priority ? '' : 'transition-opacity duration-200 ease-out motion-reduce:duration-0',
        !priority && !loaded ? 'opacity-0' : 'opacity-100',
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
          'absolute inset-0 z-[2] overflow-hidden',
          showPlaceholder && 'bg-zinc-200/80',
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
        showPlaceholder && 'bg-zinc-200/80',
        wrapperClassName,
      )}
    >
      {image}
    </span>
  );
}
