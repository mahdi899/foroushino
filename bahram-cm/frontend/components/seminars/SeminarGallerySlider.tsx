'use client';

import { useEffect, useRef, useState } from 'react';
import { SiteImage } from '@/components/ui/SiteImage';
import { cn } from '@/lib/cn';
import type { PublicSeminarSliderItem } from '@/lib/services/seminars';

const AUTO_MS = 4200;

type SeminarGallerySliderProps = {
  items: PublicSeminarSliderItem[];
};

export function SeminarGallerySlider({ items }: SeminarGallerySliderProps) {
  const slides = items.filter((item) => Boolean(item.src?.trim())).slice(0, 6);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [perView, setPerView] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setPerView(window.matchMedia('(min-width: 1024px)').matches ? 3 : 1);
    sync();
    window.addEventListener('resize', sync);
    return () => window.removeEventListener('resize', sync);
  }, []);

  const maxIndex = Math.max(0, slides.length - perView);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || slides.length <= perView) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length, perView, maxIndex]);

  if (slides.length === 0) return null;

  const stepPercent = 100 / perView;

  return (
    <div
      className="mt-8 sm:mt-10 lg:mt-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="overflow-hidden" dir="ltr">
        <div
          ref={trackRef}
          className="flex transition-transform duration-700 ease-[var(--ease-luxe)]"
          style={{ transform: `translateX(-${index * stepPercent}%)` }}
        >
          {slides.map((slide, i) => (
            <div
              key={`${slide.src}-${i}`}
              className="min-w-0 shrink-0 px-1 sm:px-1.5 lg:px-2"
              style={{ width: `${stepPercent}%` }}
            >
              <div className="overflow-hidden rounded-[1rem] border border-bone/10 bg-charcoal/35 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.85)] sm:rounded-[1.15rem]">
                <div className="relative aspect-video">
                  <SiteImage
                    src={slide.src}
                    alt={slide.alt?.trim() || `اسلاید ${i + 1}`}
                    fill
                    sizes="(max-width: 1023px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {maxIndex > 0 ? (
        <div className="mt-4 flex items-center justify-center gap-1.5 sm:mt-5">
          {Array.from({ length: maxIndex + 1 }).map((_, dot) => (
            <button
              key={dot}
              type="button"
              aria-label={`اسلاید ${dot + 1}`}
              aria-current={dot === index}
              onClick={() => setIndex(dot)}
              className={cn(
                'h-1.5 rounded-full transition-all duration-500',
                dot === index ? 'w-6 bg-gold' : 'w-1.5 bg-bone/25 hover:bg-bone/45',
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
