'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Play, X } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
import { SeminarGallerySlider } from '@/components/seminars/SeminarGallerySlider';
import { cn } from '@/lib/cn';
import { primarySiteImageSrc, resolveMediaUrl } from '@/lib/mediaUrl';
import type { PublicSeminarGalleryItem, PublicSeminarSliderItem } from '@/lib/services/seminars.types';

type SeminarRecapGalleryProps = {
  items: PublicSeminarGalleryItem[];
  sliderItems?: PublicSeminarSliderItem[];
  title: string;
};

type GallerySlot = {
  item: PublicSeminarGalleryItem;
  className: string;
  priority?: boolean;
  fillCell?: boolean;
};

function GalleryImage({
  item,
  priority,
  fillCell,
  className,
}: {
  item: PublicSeminarGalleryItem;
  priority?: boolean;
  fillCell?: boolean;
  className?: string;
}) {
  const alt = item.alt?.trim() || 'گالری سمینار';
  const frameClass = fillCell
    ? 'absolute inset-0 h-full w-full'
    : item.aspect === '9:16'
      ? 'aspect-[9/16]'
      : 'aspect-video';

  return (
    <div className={cn('group relative overflow-hidden bg-charcoal/60', frameClass, className)}>
      <SiteImage
        src={item.src}
        alt={alt}
        fill
        sizes={
          fillCell || item.aspect === '9:16'
            ? '(max-width: 1024px) 50vw, 380px'
            : '(max-width: 768px) 100vw, 960px'
        }
        priority={priority}
        className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.03]"
      />
    </div>
  );
}

function GalleryVideoThumb({
  item,
  fillCell,
  className,
  onOpen,
}: {
  item: PublicSeminarGalleryItem;
  fillCell?: boolean;
  className?: string;
  onOpen: () => void;
}) {
  const alt = item.alt?.trim() || 'ویدیوی سمینار';
  const frameClass = fillCell
    ? 'absolute inset-0 h-full w-full'
    : item.aspect === '9:16'
      ? 'aspect-[9/16]'
      : 'aspect-video';

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`پخش ${alt}`}
      className={cn(
        'group relative block w-full overflow-hidden bg-charcoal/60 text-start',
        frameClass,
        className,
      )}
    >
      {item.poster ? (
        <SiteImage
          src={item.poster}
          alt={alt}
          fill
          sizes={item.aspect === '9:16' ? '(max-width: 1024px) 50vw, 380px' : '(max-width: 768px) 100vw, 960px'}
          className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.03]"
        />
      ) : (
        <span className="absolute inset-0 bg-gradient-to-br from-charcoal to-ink" />
      )}
      <span className="absolute inset-0 bg-ink/25 transition group-hover:bg-ink/35" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-gold/35 bg-ink/55 text-gold shadow-[0_12px_40px_-12px_rgba(0,0,0,0.8)] backdrop-blur-md transition duration-500 group-hover:scale-105 group-hover:border-gold/55 sm:h-16 sm:w-16">
          <Play className="ms-0.5 h-6 w-6 fill-current sm:h-7 sm:w-7" aria-hidden />
        </span>
      </span>
      <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-pill border border-bone/15 bg-ink/55 px-2.5 py-1 text-[11px] text-bone-dim backdrop-blur-sm">
        ویدیو
      </span>
    </button>
  );
}

function SeminarVideoLightbox({
  item,
  onClose,
}: {
  item: PublicSeminarGalleryItem;
  onClose: () => void;
}) {
  const src = resolveMediaUrl(item.src) || item.src;
  const poster = item.poster ? primarySiteImageSrc(item.poster) : undefined;
  const isPortrait = item.aspect === '9:16';

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/85 p-3 backdrop-blur-sm sm:p-6"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-2xl border border-bone/15 bg-ink shadow-[0_30px_100px_-40px_rgba(0,0,0,0.9)]',
          isPortrait ? 'max-h-[88vh] max-w-[min(100%,24rem)]' : 'max-w-5xl',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={item.alt?.trim() || 'پخش ویدیو'}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute end-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-bone/20 bg-ink/70 text-bone backdrop-blur-md transition hover:border-gold/40 hover:text-gold"
          aria-label="بستن"
        >
          <X className="h-5 w-5" />
        </button>
        <div className={cn('relative bg-black', isPortrait ? 'aspect-[9/16]' : 'aspect-video')}>
          <video
            className="absolute inset-0 h-full w-full object-contain"
            controls
            playsInline
            preload="metadata"
            poster={poster}
            autoPlay
          >
            <source src={src} />
          </video>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** Desktop editorial bento — unchanged intent from current good desktop layout. */
function buildDesktopSlots(items: PublicSeminarGalleryItem[]): GallerySlot[] {
  const wide = [...items.filter((i) => i.aspect === '16:9')];
  const tall = [...items.filter((i) => i.aspect === '9:16')];
  const slots: GallerySlot[] = [];
  const shift = <T,>(arr: T[]): T | undefined => arr.shift();

  const hero = shift(wide) ?? shift(tall);
  const side = shift(tall);
  const under = shift(wide);

  if (hero) {
    slots.push({
      item: hero,
      className: side
        ? 'hidden lg:block lg:col-span-8 lg:col-start-1 lg:row-start-1'
        : 'hidden lg:block lg:col-span-12',
      priority: true,
    });
  }
  if (side) {
    slots.push({
      item: side,
      className: 'hidden lg:block lg:col-span-4 lg:col-start-9 lg:row-span-2 lg:row-start-1',
      fillCell: true,
    });
  }
  if (under) {
    slots.push({
      item: under,
      className: side
        ? 'hidden lg:block lg:col-span-8 lg:col-start-1 lg:row-start-2'
        : 'hidden lg:block lg:col-span-12',
    });
  }

  const videoWide = wide.findIndex((i) => i.type === 'video');
  if (videoWide >= 0) {
    const [video] = wide.splice(videoWide, 1);
    slots.push({ item: video, className: 'hidden lg:block lg:col-span-12' });
  } else {
    const w = shift(wide);
    const t = shift(tall);
    if (w && t) {
      slots.push({ item: w, className: 'hidden lg:block lg:col-span-8' });
      slots.push({ item: t, className: 'hidden lg:block lg:col-span-4', fillCell: true });
    } else if (w) {
      slots.push({ item: w, className: 'hidden lg:block lg:col-span-12' });
    }
  }

  if (tall.length >= 3) {
    tall.splice(0, 3).forEach((item) => {
      slots.push({ item, className: 'hidden lg:block lg:col-span-4' });
    });
  } else if (tall.length === 2) {
    tall.splice(0, 2).forEach((item) => {
      slots.push({ item, className: 'hidden lg:block lg:col-span-6' });
    });
  }

  while (wide.length > 0) {
    if (wide.length === 1 || wide[0].type === 'video') {
      slots.push({ item: shift(wide)!, className: 'hidden lg:block lg:col-span-12' });
      continue;
    }
    slots.push({ item: shift(wide)!, className: 'hidden lg:block lg:col-span-6' });
    slots.push({ item: shift(wide)!, className: 'hidden lg:block lg:col-span-6' });
  }

  if (tall.length === 1) {
    slots.push({ item: shift(tall)!, className: 'hidden lg:block lg:col-span-4 lg:col-start-5' });
  } else if (tall.length === 2) {
    tall.splice(0).forEach((item) => {
      slots.push({ item, className: 'hidden lg:block lg:col-span-6' });
    });
  } else {
    tall.splice(0).forEach((item) => {
      slots.push({ item, className: 'hidden lg:block lg:col-span-4' });
    });
  }

  return slots;
}

/**
 * Mobile/tablet: clearer rhythm —
 * full-width hero → portrait pair → full video → stacked wides → portrait grid.
 */
function buildMobileSlots(items: PublicSeminarGalleryItem[]): GallerySlot[] {
  const wide = [...items.filter((i) => i.aspect === '16:9')];
  const tall = [...items.filter((i) => i.aspect === '9:16')];
  const slots: GallerySlot[] = [];
  const shift = <T,>(arr: T[]): T | undefined => arr.shift();

  const hero = shift(wide) ?? shift(tall);
  if (hero) {
    slots.push({
      item: hero,
      className: 'col-span-2 lg:hidden',
      priority: true,
    });
  }

  // first portrait pair
  if (tall.length >= 2) {
    const a = shift(tall)!;
    const b = shift(tall)!;
    slots.push({ item: a, className: 'col-span-1 lg:hidden' });
    slots.push({ item: b, className: 'col-span-1 lg:hidden' });
  } else if (tall.length === 1) {
    slots.push({ item: shift(tall)!, className: 'col-span-2 mx-auto w-full max-w-[18rem] lg:hidden' });
  }

  // featured video
  const videoIdx = wide.findIndex((i) => i.type === 'video');
  if (videoIdx >= 0) {
    const [video] = wide.splice(videoIdx, 1);
    slots.push({ item: video, className: 'col-span-2 lg:hidden' });
  }

  // remaining wides stacked full-bleed
  while (wide.length > 0) {
    slots.push({ item: shift(wide)!, className: 'col-span-2 lg:hidden' });
  }

  // remaining portraits in pairs
  while (tall.length > 0) {
    if (tall.length === 1) {
      slots.push({
        item: shift(tall)!,
        className: 'col-span-2 mx-auto w-full max-w-[18rem] lg:hidden',
      });
      break;
    }
    slots.push({ item: shift(tall)!, className: 'col-span-1 lg:hidden' });
    slots.push({ item: shift(tall)!, className: 'col-span-1 lg:hidden' });
  }

  return slots;
}

export function SeminarRecapGallery({ items, sliderItems = [], title }: SeminarRecapGalleryProps) {
  const safeItems = useMemo(() => items.filter((item) => Boolean(item.src?.trim())), [items]);
  const slots = useMemo(
    () => [...buildMobileSlots(safeItems), ...buildDesktopSlots(safeItems)],
    [safeItems],
  );
  const [activeVideo, setActiveVideo] = useState<PublicSeminarGalleryItem | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (slots.length === 0 && sliderItems.length === 0) return null;

  return (
    <section id="seminar-gallery" className="relative scroll-mt-20 bg-ink py-12 sm:py-16 md:py-20 lg:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-bone/10 to-transparent"
      />

      <div className="container-luxe min-w-0">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-caption text-gold">گالری رویداد</p>
            <h2 className="mt-2 text-h3 text-bone">لحظه‌های {title}</h2>
          </div>
        </Reveal>

        {slots.length > 0 ? (
          <div className="mt-8 grid grid-cols-2 gap-2.5 sm:mt-10 sm:gap-3.5 lg:mt-12 lg:auto-rows-[minmax(0,auto)] lg:grid-cols-12 lg:gap-5 xl:gap-6">
            {slots.map((slot, index) => (
              <Reveal
                key={`${slot.item.src}-${slot.className}-${index}`}
                className={cn(
                  'min-w-0',
                  slot.className,
                  slot.fillCell && 'relative lg:min-h-[24rem]',
                )}
              >
                <div
                  className={cn(
                    'overflow-hidden rounded-[1rem] border border-bone/10 bg-charcoal/35 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.85)] sm:rounded-[1.15rem] lg:rounded-[1.25rem]',
                    slot.fillCell && 'absolute inset-0',
                    slot.item.aspect === '9:16' &&
                      !slot.fillCell &&
                      !slot.className.includes('max-w-') &&
                      'lg:max-w-none',
                  )}
                >
                  {slot.item.type === 'video' ? (
                    <GalleryVideoThumb
                      item={slot.item}
                      fillCell={slot.fillCell}
                      onOpen={() => setActiveVideo(slot.item)}
                    />
                  ) : (
                    <GalleryImage item={slot.item} priority={slot.priority} fillCell={slot.fillCell} />
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        ) : null}

        {sliderItems.length > 0 ? (
          <Reveal>
            <SeminarGallerySlider items={sliderItems} />
          </Reveal>
        ) : null}
      </div>

      {mounted && activeVideo ? (
        <SeminarVideoLightbox item={activeVideo} onClose={() => setActiveVideo(null)} />
      ) : null}
    </section>
  );
}
