'use client';

import NextImage, { type ImageProps } from 'next/image';
import { ImageIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { GRAY_BLUR_DATA_URL } from '@/lib/imagePlaceholder';
import { IMAGE_SIZES } from '@/lib/imageSizes';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { useLazyImages } from '@/components/performance/PerformanceProvider';
import { cn } from '@/lib/utils';

export type AppImageProps = ImageProps & {
  /** Extra classes on the non-fill wrapper span. */
  wrapperClassName?: string;
  /** IntersectionObserver root margin — load slightly before entering viewport. */
  rootMargin?: string;
};

function ImagePlaceholder({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-center justify-center bg-zinc-200', className)}
      aria-hidden
    >
      <ImageIcon className="h-7 w-7 text-zinc-400/90" strokeWidth={1.25} />
    </div>
  );
}

/**
 * Site-wide lazy image: placeholder shell, IntersectionObserver gate, smooth fade-in on load.
 * Use `priority` only for above-the-fold LCP images (hero, article cover).
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
  rootMargin = '240px 0px',
  ...props
}: AppImageProps) {
  const lazyImages = useLazyImages();
  const shouldDefer = !priority && lazyImages;
  const [inView, setInView] = useState(!shouldDefer);
  const [loaded, setLoaded] = useState(false);
  const hostRef = useRef<HTMLSpanElement>(null);
  const showShell = shouldDefer && (!inView || !loaded);
  const resolvedSrc = typeof src === 'string' ? resolveMediaUrl(src) : src;

  useEffect(() => {
    if (!shouldDefer) {
      setInView(true);
      return;
    }

    const node = hostRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldDefer, rootMargin]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setLoaded(true);
      onLoad?.(event);
    },
    [onLoad],
  );

  const useBlur = placeholder !== 'empty';
  const shell = showShell ? (
    <ImagePlaceholder className={cn('absolute inset-0 z-[1]', fill ? '' : 'min-h-[inherit]')} />
  ) : null;

  const image =
    inView ? (
      <NextImage
        {...props}
        src={resolvedSrc}
        fill={fill}
        sizes={sizes ?? (fill ? IMAGE_SIZES.fillDefault : undefined)}
        priority={priority}
        loading={priority ? undefined : (loading ?? 'lazy')}
        fetchPriority={priority ? 'high' : (fetchPriority ?? 'auto')}
        decoding={decoding}
        placeholder={useBlur ? 'blur' : 'empty'}
        blurDataURL={useBlur ? (blurDataURL ?? GRAY_BLUR_DATA_URL) : undefined}
        className={cn(
          'transition-opacity duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-0',
          showShell ? 'opacity-0' : 'opacity-100',
          fill && 'z-[2]',
          className,
        )}
        onLoad={handleLoad}
      />
    ) : null;

  if (fill) {
    return (
      <>
        <span ref={hostRef} className="absolute inset-0 z-0 pointer-events-none" aria-hidden />
        {shell}
        {image}
      </>
    );
  }

  return (
    <span
      ref={hostRef}
      className={cn('relative inline-block overflow-hidden bg-zinc-200', wrapperClassName)}
    >
      {shell}
      {image}
    </span>
  );
}
