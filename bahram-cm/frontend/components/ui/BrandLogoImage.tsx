'use client';

import NextImage from 'next/image';
import { brandLogoDisplay, sitePhotos } from '@/lib/site-photo-paths';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

type BrandLogoImageProps = {
  /** Rendered CSS pixel size (width = height). */
  size: number;
  className?: string;
  priority?: boolean;
};

/**
 * Optimized circular brand mark — requests a right-sized derivative via next/image
 * instead of downloading the full 1024×1024 source for nav/footer slots.
 */
export function BrandLogoImage({ size, className, priority = false }: BrandLogoImageProps) {
  const src = primarySiteImageSrc(sitePhotos.logoBahram) ?? sitePhotos.logoBahram;

  return (
    <NextImage
      src={src}
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      priority={priority}
      fetchPriority={priority ? 'high' : 'auto'}
      className={cn(brandLogoDisplay.imageClass, className)}
    />
  );
}
