'use client';

import { Download, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import type { FamilyMediaBlock } from '@/lib/family/types';

type LoadPhase = 'loading-preview' | 'preview' | 'loading-sharp' | 'sharp' | 'error';

function aspectStyle(media: FamilyMediaBlock): { aspectRatio: string } {
  return media.width && media.height
    ? { aspectRatio: `${media.width} / ${media.height}` }
    : { aspectRatio: '1' };
}

function ImageLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/92 p-4"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="بستن"
        className="absolute end-4 top-4 rounded-full bg-black/50 p-2 text-bone/80 hover:bg-black/70"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-xl object-contain"
      />
    </div>
  );
}

export function ImageBlock({
  media,
  className,
  roundedClass = 'rounded-2xl',
  fillCell = false,
  constrained = false,
}: {
  media: FamilyMediaBlock;
  className?: string;
  roundedClass?: string;
  fillCell?: boolean;
  constrained?: boolean;
}) {
  const [phase, setPhase] = useState<LoadPhase>('loading-preview');
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!media.url) return;

    setPhase('loading-preview');
    const img = new window.Image();
    img.onload = () => setPhase('preview');
    img.onerror = () => setPhase('error');
    img.src = media.url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [media.url]);

  useEffect(() => {
    if (phase !== 'loading-sharp' || !media.url) return;

    const img = new window.Image();
    img.onload = () => setPhase('sharp');
    img.onerror = () => setPhase('error');
    img.src = media.url;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [phase, media.url]);

  if (!media.url) {
    return <div className={cn('aspect-square w-full bg-white/5', roundedClass, className)} />;
  }

  const handleClick = () => {
    if (phase === 'preview' || phase === 'error') {
      setPhase('loading-sharp');
      return;
    }
    if (phase === 'sharp') {
      setLightboxOpen(true);
    }
  };

  const showImage = phase === 'preview' || phase === 'loading-sharp' || phase === 'sharp';
  const isBlurred = phase === 'preview' || phase === 'loading-sharp';
  const containerStyle = fillCell
    ? undefined
    : constrained
      ? { aspectRatio: '4 / 3', maxHeight: 'min(42vh, 320px)' }
      : aspectStyle(media);

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={phase === 'loading-preview' || phase === 'loading-sharp'}
        className={cn(
          'relative block w-full overflow-hidden bg-white/5',
          fillCell ? 'h-full min-h-0' : '',
          roundedClass,
          className,
        )}
        style={containerStyle}
      >
        {phase === 'loading-preview' && (
          <span className="absolute inset-0 animate-pulse bg-white/[0.08]" aria-hidden />
        )}

        {showImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.url}
            alt=""
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-500 ease-out',
              isBlurred ? 'scale-110 blur-2xl' : 'scale-100 blur-0',
            )}
          />
        )}

        {phase === 'preview' && (
          <span className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm">
              <Download className="h-5 w-5 text-white/90" strokeWidth={2.25} />
            </span>
          </span>
        )}

        {phase === 'loading-sharp' && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Loader2 className="h-7 w-7 animate-spin text-gold/80" aria-hidden />
            <span className="sr-only">در حال بارگذاری کیفیت بالا…</span>
          </span>
        )}

        {phase === 'error' && (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/40 text-bone/70">
            <span className="text-xs">بارگذاری ناموفق</span>
            <span className="text-[11px] text-gold/80">دوباره امتحان کن</span>
          </span>
        )}
      </button>

      {lightboxOpen && phase === 'sharp' && (
        <ImageLightbox url={media.url} onClose={() => setLightboxOpen(false)} />
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

export function ImageAlbumBlock({ items, constrained = false }: { items: FamilyMediaBlock[]; constrained?: boolean }) {
  const count = items.length;

  const gridClass =
    count === 1
      ? cn('grid grid-cols-1', constrained && 'max-h-[min(42vh,320px)]')
      : count === 2
        ? 'grid grid-cols-2 gap-0.5'
        : count === 3
          ? 'grid aspect-[5/4] grid-cols-2 grid-rows-2 gap-0.5'
          : count === 4
            ? 'grid aspect-square grid-cols-2 grid-rows-2 gap-0.5'
            : 'grid grid-cols-2 gap-0.5 sm:grid-cols-3';

  return (
    <div className={gridClass}>
      {items.map((item, index) => (
        <div key={item.id} className={cn('relative min-h-0', albumLayoutClass(count, index))}>
          <ImageBlock
            media={item}
            fillCell={count > 1}
            constrained={constrained}
            roundedClass={albumRoundedClass(count, index)}
            className="absolute inset-0 h-full w-full"
          />
        </div>
      ))}
    </div>
  );
}
