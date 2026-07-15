'use client';

import { Download, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { useDelayedInView } from '@/hooks/useDelayedInView';
import { ImageZoomLightbox } from '@/components/family/blocks/ImageZoomLightbox';
import { useFamilyFeedMedia } from '@/lib/family/FamilyFeedMediaContext';
import {
  getFamilyMediaBlobUrl,
  readFamilyMediaBlob,
  tryCacheFamilyMediaBlob,
} from '@/lib/family/mediaCache';
import { enqueueFamilyMediaLoad } from '@/lib/family/mediaLoadQueue';
import { tryBuildImagePreviewBlob } from '@/lib/family/mediaPreview';
import type { FamilyMediaBlock } from '@/lib/family/types';

type LoadPhase = 'idle' | 'preview' | 'loading' | 'loaded' | 'error';

function aspectStyle(media: FamilyMediaBlock): { aspectRatio: string } {
  return media.width && media.height
    ? { aspectRatio: `${media.width} / ${media.height}` }
    : { aspectRatio: '1' };
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
  const [phase, setPhase] = useState<LoadPhase>('idle');
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [openLightboxWhenLoaded, setOpenLightboxWhenLoaded] = useState(false);
  const previewRequestedRef = useRef(false);
  const warmedRef = useRef(false);
  const { scrollIdle } = useFamilyFeedMedia();

  const canRequestPreview = phase === 'idle';
  const previewReady = useDelayedInView(rootRef, 900, canRequestPreview, scrollIdle);

  const applyCachedSources = useCallback(async () => {
    if (!media.url) return false;

    const full = await readFamilyMediaBlob('full', media.id, media.url);
    if (full) {
      setDisplayUrl(getFamilyMediaBlobUrl(`full:${media.id}`, full));
      setPhase('loaded');
      return true;
    }

    const preview = await readFamilyMediaBlob('preview', media.id, media.url);
    if (preview) {
      setDisplayUrl(getFamilyMediaBlobUrl(`preview:${media.id}`, preview));
      setPhase('preview');
      return true;
    }

    return false;
  }, [media.id, media.url]);

  useEffect(() => {
    let cancelled = false;
    void applyCachedSources().then((hit) => {
      if (!cancelled && !hit && media.url) {
        setDisplayUrl(null);
        setPhase('idle');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [applyCachedSources, media.url]);

  useEffect(() => {
    if (!previewReady || !media.url || phase !== 'idle' || previewRequestedRef.current) return;

    previewRequestedRef.current = true;
    let cancelled = false;

    void enqueueFamilyMediaLoad('preview', media.id, async () => {
      const previewBlob = await tryBuildImagePreviewBlob(media.id, media.url!);
      if (cancelled) return;

      if (previewBlob) {
        setDisplayUrl(getFamilyMediaBlobUrl(`preview:${media.id}`, previewBlob));
        setPhase('preview');
        return;
      }

      setDisplayUrl(media.url);
      setPhase('preview');
    });

    return () => {
      cancelled = true;
    };
  }, [media.id, media.url, phase, previewReady]);

  const warmFullCache = useCallback(() => {
    if (!media.url || warmedRef.current) return;
    warmedRef.current = true;
    void tryCacheFamilyMediaBlob(media.url, media.id, 'full');
  }, [media.id, media.url]);

  const handleImageLoad = useCallback(() => {
    if (phase === 'loading') {
      warmFullCache();
      setPhase('loaded');
      return;
    }

    if (phase === 'idle' || phase === 'preview') {
      if (!displayUrl && media.url) setDisplayUrl(media.url);
    }
  }, [displayUrl, media.url, phase, warmFullCache]);

  const handleImageError = useCallback(() => {
    if (phase === 'loading' || phase === 'preview') {
      setPhase('error');
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== 'loaded' || !openLightboxWhenLoaded) return;
    setOpenLightboxWhenLoaded(false);
    if (manageLightboxExternally && onOpenLightbox) {
      onOpenLightbox();
      return;
    }
    setLightboxOpen(true);
  }, [manageLightboxExternally, onOpenLightbox, openLightboxWhenLoaded, phase]);

  if (!media.url) {
    return <div className={cn('aspect-square w-full bg-white/5', roundedClass, className)} />;
  }

  const openLoaded = () => {
    if (manageLightboxExternally && onOpenLightbox) {
      onOpenLightbox();
      return;
    }
    setLightboxOpen(true);
  };

  const handleClick = () => {
    if (phase === 'loaded') {
      openLoaded();
      return;
    }

    if (phase === 'preview') {
      if (manageLightboxExternally) {
        setOpenLightboxWhenLoaded(true);
      }
      setDisplayUrl((current) => current ?? media.url);
      setPhase('loaded');
      warmFullCache();
      return;
    }

    if (phase === 'idle' || phase === 'error') {
      if (manageLightboxExternally) {
        setOpenLightboxWhenLoaded(true);
      }
      previewRequestedRef.current = true;
      setDisplayUrl(media.url);
      setPhase('loading');
    }
  };

  const containerStyle = fillCell ? undefined : aspectStyle(media);
  const imgSrc = displayUrl ?? (phase === 'loading' ? media.url : null);
  const lightboxUrl = displayUrl ?? media.url;
  const showDownloadHint = phase === 'idle' || phase === 'preview';
  const isBlurredPreview = phase === 'preview';

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={handleClick}
        disabled={phase === 'loading'}
        className={cn(
          'relative block overflow-hidden bg-white/5',
          fillCell ? 'h-full min-h-0 w-full' : constrained ? 'family-feed-image' : 'w-full',
          roundedClass,
          className,
        )}
        style={containerStyle}
      >
        {phase === 'idle' && !imgSrc && (
          <span className="absolute inset-0 animate-pulse bg-white/[0.06]" aria-hidden />
        )}

        {imgSrc && phase !== 'error' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt=""
            decoding="async"
            onLoad={handleImageLoad}
            onError={handleImageError}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-500 ease-out',
              isBlurredPreview ? 'scale-110 blur-md brightness-95' : 'scale-100 blur-0',
            )}
          />
        )}

        {showDownloadHint && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Download className="h-5 w-5 text-white/90" strokeWidth={2.25} />
            </span>
          </span>
        )}

        {phase === 'loading' && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Loader2 className="h-7 w-7 animate-spin text-gold/80" aria-hidden />
            <span className="sr-only">در حال بارگذاری…</span>
          </span>
        )}

        {phase === 'error' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 text-bone/70">
            <span className="text-xs">بارگذاری ناموفق</span>
            <span className="text-[11px] text-gold/80">دوباره امتحان کن</span>
          </span>
        )}
      </button>

      {!manageLightboxExternally && lightboxOpen && phase === 'loaded' && lightboxUrl && (
        <ImageZoomLightbox url={lightboxUrl} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  );
}

export function ImageAlbumBlock({ items, constrained = false }: { items: FamilyMediaBlock[]; constrained?: boolean }) {
  const count = items.length;
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const galleryEntries = items
    .map((item, itemIndex) => ({ url: item.url, itemIndex }))
    .filter((entry): entry is { url: string; itemIndex: number } => Boolean(entry.url));
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
