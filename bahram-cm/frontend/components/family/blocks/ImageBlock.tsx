'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useFamilyFeedMediaInView } from '@/hooks/useFamilyFeedMediaInView';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { ImageZoomLightbox } from '@/components/family/blocks/ImageZoomLightbox';
import { useFamilyImageSrc } from '@/lib/family/useFamilyImageSrc';
import {
  resolveFamilyMediaDownloadUrl,
  resolveFamilyMediaPosterUrl,
  resolveFamilyMediaUrl,
} from '@/lib/family/mediaPlaybackUrl';
import { hasFamilyMediaBeenSeen, markFamilyMediaSeen } from '@/lib/family/seenFamilyMedia';
import { rememberFamilyMediaView } from '@/lib/family/mediaCache';
import type { FamilyMediaBlock } from '@/lib/family/types';

/** Always reserve height so the virtualizer never measures a collapsed 0-tall image row. */
function aspectStyle(media: FamilyMediaBlock): { aspectRatio: string } {
  return media.width && media.height
    ? { aspectRatio: `${media.width} / ${media.height}` }
    : { aspectRatio: '4 / 3' };
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [lqipReady, setLqipReady] = useState(false);

  // Same-origin (or CDN) stream URL — never a blob: object URL.
  const { src: imageUrl, resolved } = useFamilyImageSrc(media.url, media.id);
  const lqipUrl = resolveFamilyMediaPosterUrl(media.poster_url);
  const seenInSession =
    hasFamilyMediaBeenSeen(imageUrl) || hasFamilyMediaBeenSeen(lqipUrl);
  const inView = useFamilyFeedMediaInView(rootRef, resolved && Boolean(imageUrl) && !seenInSession);
  const shouldLoad = seenInSession || inView;
  const downloadUrl = resolveFamilyMediaDownloadUrl(media.url) ?? media.url;

  useEffect(() => {
    if (hasFamilyMediaBeenSeen(imageUrl)) {
      setLoaded(true);
      setError(false);
      setLqipReady(true);
      return;
    }
    setLoaded(false);
    setError(false);
    setLqipReady(hasFamilyMediaBeenSeen(lqipUrl));
  }, [imageUrl, lqipUrl]);

  if (resolved && !imageUrl) {
    return <div className={cn('aspect-square w-full', roundedClass, className)} style={aspectStyle(media)} />;
  }

  const containerStyle = fillCell ? undefined : aspectStyle(media);

  const openLightbox = () => {
    if (manageLightboxExternally && onOpenLightbox) {
      onOpenLightbox();
      return;
    }
    setLightboxOpen(true);
  };

  const retryLoad = () => {
    setError(false);
    setLoaded(false);
  };

  const handleActivate = () => {
    if (error) {
      retryLoad();
      return;
    }
    openLightbox();
  };

  return (
    <>
      <div
        ref={rootRef}
        role="button"
        tabIndex={0}
        onClick={(event) => {
          event.stopPropagation();
          handleActivate();
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return;
          event.preventDefault();
          event.stopPropagation();
          handleActivate();
        }}
        className={cn(
          'relative block cursor-pointer overflow-hidden',
          fillCell ? 'h-full min-h-0 w-full' : constrained ? 'family-feed-image' : 'w-full',
          roundedClass,
          className,
        )}
        style={containerStyle}
      >
        {shouldLoad && lqipUrl && !error && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`lqip-${lqipUrl}`}
            src={lqipUrl}
            alt=""
            decoding="async"
            aria-hidden
            onLoad={() => {
              markFamilyMediaSeen(lqipUrl);
              setLqipReady(true);
            }}
            className={cn(
              'pointer-events-none absolute inset-0 h-full w-full object-cover scale-[1.08] blur-xl transition-opacity duration-200',
              loaded || !lqipReady ? 'opacity-0' : 'opacity-100',
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
            fetchPriority="auto"
            onLoad={() => {
              markFamilyMediaSeen(imageUrl);
              rememberFamilyMediaView(imageUrl, media.id, 'image', media.mime_type);
              setLoaded(true);
            }}
            onError={() => setError(true)}
            className={cn(
              'absolute inset-0 h-full w-full transition-opacity duration-150 ease-out',
              loaded ? 'opacity-100' : 'opacity-0',
              fillCell ? 'object-cover' : 'object-contain',
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
      </div>

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
        ? 'grid min-h-[120px] grid-cols-2 gap-0.5'
        : count === 3
          ? 'grid aspect-[5/4] grid-cols-2 grid-rows-2 gap-0.5'
          : count === 4
            ? 'grid aspect-square grid-cols-2 grid-rows-2 gap-0.5'
            : // Intrinsic height required — absolute fillCell children collapse the parent otherwise.
              'grid aspect-[4/5] max-h-[var(--family-media-album-max-h)] grid-cols-2 gap-0.5 sm:aspect-[3/2] sm:grid-cols-3';

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
