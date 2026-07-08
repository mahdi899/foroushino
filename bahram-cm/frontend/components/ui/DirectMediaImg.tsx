import type { ImgHTMLAttributes } from 'react';
import { normalizeAdminMediaUrl, primarySiteImageSrc } from '@/lib/mediaUrl';
import { cn } from '@/lib/utils';

export type DirectMediaImgProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
  src: string | null | undefined;
  /** Use admin gallery URL normalization (same-origin `/storage/...`). */
  admin?: boolean;
  fill?: boolean;
};

/** Native `<img>` — direct `/storage/...` URL from the media library, never `/_next/image`. */
export function DirectMediaImg({
  src,
  admin = false,
  fill,
  className,
  alt = '',
  loading,
  decoding = 'async',
  ...props
}: DirectMediaImgProps) {
  const raw = src?.trim() ?? '';
  const resolved = raw
    ? admin
      ? normalizeAdminMediaUrl(raw)
      : primarySiteImageSrc(raw)
    : '';

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      src={resolved || raw}
      alt={alt}
      loading={loading ?? 'lazy'}
      decoding={decoding}
      className={cn(fill && 'absolute inset-0 h-full w-full', className)}
    />
  );
}
