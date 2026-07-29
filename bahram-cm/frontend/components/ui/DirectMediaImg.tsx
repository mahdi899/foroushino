'use client';

import { useCallback, useEffect, useMemo, useState, type ImgHTMLAttributes } from 'react';
import { normalizeAdminMediaUrl, primarySiteImageSrc, resolveMediaUrl, siteMediaFallbacks } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

export type DirectMediaImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> & {
  src: string | null | undefined;
  /** Use admin gallery URL normalization (same-origin `/storage/...`). */
  admin?: boolean;
  fill?: boolean;
  onError?: ImgHTMLAttributes<HTMLImageElement>['onError'];
};

/** Native `<img>` — media library URL, never `/_next/image`. Falls back CDN → `/storage/...`. */
export function DirectMediaImg({
  src,
  admin = false,
  fill,
  className,
  alt = '',
  loading,
  decoding = 'async',
  onError,
  ...props
}: DirectMediaImgProps) {
  const raw = src?.trim() ?? '';
  const fallbacks = useMemo(() => {
    if (!raw) return [];
    if (admin) {
      const resolved = resolveMediaUrl(raw) || normalizeAdminMediaUrl(raw) || raw;
      return resolved === raw ? [raw] : [resolved, raw];
    }
    const ordered = siteMediaFallbacks(raw);
    const primary = primarySiteImageSrc(raw);
    if (primary && !ordered.includes(primary)) {
      return [primary, ...ordered];
    }
    return ordered.length > 0 ? ordered : primary ? [primary] : [raw];
  }, [admin, raw]);

  const [fallbackIndex, setFallbackIndex] = useState(0);

  useEffect(() => {
    setFallbackIndex(0);
  }, [raw]);

  const resolved = fallbacks[fallbackIndex] ?? primarySiteImageSrc(raw) ?? raw;

  const handleError = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
      setFallbackIndex((prev) => (prev + 1 < fallbacks.length ? prev + 1 : prev));
      onError?.(event);
    },
    [fallbacks.length, onError],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolved || raw}
      alt={alt}
      loading={loading ?? 'lazy'}
      decoding={decoding}
      className={cn(fill && 'absolute inset-0 h-full w-full', className)}
      onError={handleError}
    />
  );
}
