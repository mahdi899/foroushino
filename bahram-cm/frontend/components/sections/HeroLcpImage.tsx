import NextImage from 'next/image';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

const disableOptimization = process.env.NEXT_PUBLIC_DISABLE_IMAGE_OPTIMIZATION === '1';

type HeroLcpImageProps = {
  src: string;
  width: number;
  height: number;
  sizes: string;
  className?: string;
  wrapperClassName?: string;
};

/**
 * Homepage hero LCP — server-rendered next/image with priority.
 * Not wrapped in framer-motion so the image can paint before hydration.
 */
export function HeroLcpImage({
  src,
  width,
  height,
  sizes,
  className,
  wrapperClassName,
}: HeroLcpImageProps) {
  const resolved = primarySiteImageSrc(src) ?? src;

  return (
    <span className={cn('hero-light-grid-picture', wrapperClassName)}>
      <NextImage
        src={resolved}
        alt=""
        width={width}
        height={height}
        sizes={sizes}
        priority
        fetchPriority="high"
        decoding="sync"
        unoptimized={disableOptimization}
        className={className}
      />
    </span>
  );
}
