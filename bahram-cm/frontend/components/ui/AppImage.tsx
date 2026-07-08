'use client';

import NextImage, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GRAY_BLUR_DATA_URL } from '@/lib/imagePlaceholder';
import { IMAGE_SIZES } from '@/lib/imageSizes';
import { normalizeImageSrc, siteMediaFallbacks } from '@/lib/mediaUrl';
import { useLazyImages } from '@/components/performance/PerformanceProvider';
import { cn } from '@/lib/utils';

export type AppImageProps = ImageProps & {
  wrapperClassName?: string;
};

function isSvgSrc(src: string): boolean {
  return /\.svg(\?|#|$)/i.test(src);
}

/**
 * Site images via Next.js optimizer (`/_next/image`) — sized to viewport, cached on the
 * Next server. Source stays `/storage/...` (no Laravel `/cdn/?w=&q=` resize).
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
  unoptimized,
  quality = 90,
  ...props
}: AppImageProps) {
  const lazyImages = useLazyImages();
  const nativeLazy = !priority && lazyImages;
  const [loaded, setLoaded] = useState(priority);
  const [fallbackIndex, setFallbackIndex] = useState(0);

  const srcString = typeof src === 'string' ? src : '';
  const svg = srcString ? isSvgSrc(srcString) : false;

  const fallbacks = useMemo(() => {
    if (!srcString) return [];
    const ordered = siteMediaFallbacks(srcString).map((url) => normalizeImageSrc(url) || url);
    const primary = normalizeImageSrc(srcString) || srcString;
    if (primary && !ordered.includes(primary)) {
      return [primary, ...ordered];
    }
    return ordered.length > 0 ? ordered : [srcString];
  }, [srcString]);

  useEffect(() => {
    setFallbackIndex(0);
    setLoaded(priority);
  }, [srcString, priority]);

  const resolvedSrc = fallbacks[fallbackIndex] ?? normalizeImageSrc(srcString) ?? srcString;

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

  const useBlur = !priority && !svg && placeholder !== 'empty';
  const showPlaceholder = !priority && !loaded && nativeLazy;
  const skipOptimizer = svg || unoptimized;

  const image = (
    <NextImage
      {...props}
      key={typeof resolvedSrc === 'string' ? resolvedSrc : undefined}
      src={resolvedSrc || src}
      fill={fill}
      sizes={sizes ?? (fill ? IMAGE_SIZES.fillDefault : undefined)}
      quality={quality}
      unoptimized={skipOptimizer}
      priority={priority}
      loading={priority ? undefined : nativeLazy ? 'lazy' : loading}
      fetchPriority={priority ? 'high' : nativeLazy ? 'low' : fetchPriority}
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
          '[&_img]:!inset-0 [&_img]:!h-full [&_img]:!w-full',
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
