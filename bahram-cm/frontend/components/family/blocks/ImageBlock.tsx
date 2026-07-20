'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useLazyInViewOnce } from '@/hooks/useLazyInViewOnce';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { ImageZoomLightbox } from '@/components/family/blocks/ImageZoomLightbox';
import { useFamilyImageSrc } from '@/lib/family/useFamilyImageSrc';
import { resolveFamilyMediaUrl } from '@/lib/family/mediaPlaybackUrl';
import type { FamilyMediaBlock } from '@/lib/family/types';

function aspectStyle(media: FamilyMediaBlock): { aspectRatio: string } | undefined {
  return media.width && media.height
    ? { aspectRatio: `${media.width} / ${media.height}` }
    : undefined;
}

export function ImageBlock({
  media,
  className,
  roundedClass = 'rounded-2xl',
  fillCell = false,
  constrained = false,
  onOpenLightbox,
  manageLightboxExternally = false,
}: {
  media: FamilyMediaBlock;
  className?: string;
  roundedClass?: string;
  fillCell?: boolean;
  constrained?: boolean;
  onOpenLightbox?: () => void;
  manageLightboxExternally?: boolean;
}) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const { src: imageUrl, previewSrc, fromCache, resolved } = useFamilyImageSrc(media.url, media.id);
  const shouldLoad = useLazyInViewOnce(rootRef, resolved && Boolean(imageUrl));
  const downloadUrl = resolveFamilyMediaUrl(media.url) ?? media.url;

  useEffect(() => {
    setLoaded(false);
    setError(false);
  }, [imageUrl]);

  useEffect(() => {
    if (fromCache) setLoaded(true);
  }, [fromCache]);

  if (resolved && !imageUrl) {
    return <div className={cn('aspect-square w-full bg-white/5', roundedClass, className)} />;
  }

  const hasKnownAspect = Boolean(media.width && media.height);
  const containerStyle = fillCell || !hasKnownAspect ? undefined : aspectStyle(media);
  const showPlaceholder = !loaded && !error;
  const showPreview = Boolean(previewSrc && showPlaceholder);

  const openLightbox = () => {
    if (manageLightboxExternally && onOpenLightbox) {
      onOpenLightbox();
      return;
    }
    setLightboxOpen(true);
  };

  const retryLoad = () => {
    setError(false);
    setLoaded(fromCache);
  };

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          if (error) {
            retryLoad();
            return;
          }
          openLightbox();
        }}
        className={cn(
          'relative block overflow-hidden bg-[color-mix(in_oklab,var(--family-text)_7%,transparent)]',
          fillCell ? 'h-full min-h-0 w-full' : constrained ? 'family-feed-image' : 'w-full',
          roundedClass,
          className,
        )}
        style={containerStyle}
      >
        {showPlaceholder && (
          <span
            className={cn(
              'absolute inset-0 bg-[color-mix(in_oklab,var(--family-text)_5%,transparent)]',
              showPreview && 'opacity-0',
            )}
            aria-hidden
          />
        )}

        {shouldLoad && showPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt=""
            decoding="async"
            aria-hidden
            className={cn(
              'absolute inset-0 h-full w-full object-cover blur-md scale-[1.03] saturate-[0.85]',
              fillCell ? 'object-cover' : 'object-contain',
            )}
          />
        )}

        {shouldLoad && imageUrl && !error && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={imageUrl}
            src={imageUrl}
            alt=""
            decoding="async"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={cn(
              fillCell || hasKnownAspect
                ? 'absolute inset-0 h-full w-full'
                : 'relative block h-auto w-full max-h-[var(--family-media-max-h)]',
              fillCell ? 'object-cover' : 'object-contain',
              loaded || fromCache ? 'opacity-100' : 'opacity-0',
              !fromCache && 'transition-opacity duration-150',
            )}
          />
        )}

        {error && downloadUrl && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/35 px-3 backdrop-blur-md">
            <span className="text-xs text-bone/75">بارگذاری ناموفق</span>
            <FamilyMediaDownloadButton
              url={downloadUrl}
              mediaId={media.id}
              label="دانلود"
              className="pointer-events-auto"
            />
          </span>
        )}
      </button>

      {!manageLightboxExternally && lightboxOpen && imageUrl && (
        <ImageZoomLightbox url={imageUrl} mediaId={media.id} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

export function ImageAlbumBlock({ items, constrained = false }: { items: FamilyMediaBlock[]; constrained?: boolean }) {
  const count = items.length;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryEntries = items
    .map((item, itemIndex) => ({
      url: resolveFamilyMediaUrl(item.url),
      mediaId: item.id,
      itemIndex,
    }))
    .filter((entry): entry is { url: string; mediaId: number; itemIndex: number } => Boolean(entry.url));
  const useSharedGallery = count > 1 && galleryEntries.length > 1;

  const gridClass =
    count === 1
      ? cn('grid grid-cols-1', constrained && 'family-feed-image')
      : count === 2
        ? 'grid grid-cols-2 gap-0.5'
        : count === 3
          ? 'grid aspect-[5/4] grid-cols-2 grid-rows-2 gap-0.5'
          : count === 4
            ? 'grid aspect-square grid-cols-2 grid-rows-2 gap-0.5'
            : 'grid grid-cols-2 gap-0.5 sm:grid-cols-3';

  return (
    <>
      <div className={cn(constrained && 'family-feed-album', gridClass)}>
        {items.map((item, index) => (
          <div key={item.id} className={cn('relative min-h-0', albumLayoutClass(count, index))}>
            <ImageBlock
              media={item}
              fillCell={count > 1}
              constrained={constrained}
              roundedClass={albumRoundedClass(count, index)}
              className="absolute inset-0 h-full w-full"
              manageLightboxExternally={useSharedGallery}
              onOpenLightbox={
                useSharedGallery
                  ? () => {
                      const pos = galleryEntries.findIndex((entry) => entry.itemIndex === index);
                      setGalleryIndex(pos >= 0 ? pos : 0);
                      setGalleryOpen(true);
                    }
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {useSharedGallery && galleryOpen && (
        <ImageZoomLightbox
          urls={galleryEntries.map((entry) => entry.url)}
          mediaIds={galleryEntries.map((entry) => entry.mediaId)}
          initialIndex={galleryIndex}
          onClose={() => setGalleryOpen(false)}
        />
      )}
    </>
  );
}

function albumLayoutClass(count: number, index: number): string {
  if (count === 1) return '';
  if (count === 2) return 'min-h-[120px]';
  if (count === 3) {
    if (index === 0) return 'col-span-1 row-span-2';
    return '';
  }
  if (count === 4) return '';
  return '';
}

function albumRoundedClass(count: number, index: number): string {
  if (count === 1) return 'rounded-2xl';
  if (count === 2) {
    return index === 0 ? 'rounded-s-2xl rounded-e-md' : 'rounded-e-2xl rounded-s-md';
  }
  if (count === 3) {
    if (index === 0) return 'rounded-s-2xl rounded-ee-md';
    if (index === 1) return 'rounded-se-md';
    return 'rounded-ee-2xl rounded-es-md';
  }
  if (count === 4) {
    if (index === 0) return 'rounded-se-2xl rounded-es-md';
    if (index === 1) return 'rounded-ss-md rounded-ee-md';
    if (index === 2) return 'rounded-es-md rounded-se-md';
    return 'rounded-ee-2xl rounded-ss-md';
  }
  return 'rounded-lg';
}
