'use client';

import { ChevronLeft, ChevronRight, Minus, Plus, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { fontClassName } from '@/lib/fonts';
import { FamilyMediaDownloadButton } from '@/components/family/FamilyMediaDownloadButton';
import { useFamilyImageSrc } from '@/lib/family/useFamilyImageSrc';
const IMMERSIVE_CLASS = 'family-app--immersive';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.28;
const DOUBLE_TAP_MS = 320;
const DOUBLE_TAP_SCALE = 2.75;
const TAP_MOVE_THRESHOLD = 14;
const SWIPE_THRESHOLD = 52;

type Vec2 = { x: number; y: number };
type TouchPoint = { clientX: number; clientY: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function touchDistance(a: TouchPoint, b: TouchPoint) {
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

function touchCenter(a: TouchPoint, b: TouchPoint): Vec2 {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

function pointDistance(a: Vec2, b: Vec2) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function ImageZoomLightbox({
  url,
  urls,
  mediaId = 0,
  mediaIds,
  initialIndex = 0,
  alt = '',
  onClose,
}: {
  url?: string;
  urls?: string[];
  mediaId?: number;
  mediaIds?: number[];
  initialIndex?: number;
  alt?: string;
  onClose: () => void;
}) {
  const sources = urls ?? (url ? [url] : []);
  const sourceMediaIds = mediaIds ?? sources.map(() => mediaId);
  const safeInitialIndex = clamp(initialIndex, 0, Math.max(0, sources.length - 1));
  const [index, setIndex] = useState(safeInitialIndex);
  const activeUrl = sources[index] ?? '';
  const activeMediaId = sourceMediaIds[index] ?? mediaId;
  const displayUrl = useFamilyImageSrc(activeUrl, activeMediaId);
  const isGallery = sources.length > 1;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Vec2>({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false);

  const scaleRef = useRef(1);
  const offsetRef = useRef<Vec2>({ x: 0, y: 0 });
  const pinchRef = useRef<{
    distance: number;
    scale: number;
    center: Vec2;
    offset: Vec2;
  } | null>(null);
  const panRef = useRef<{ start: Vec2; offset: Vec2; moved: boolean } | null>(null);
  const swipeRef = useRef<{ start: Vec2; moved: boolean } | null>(null);
  const lastTapRef = useRef<{ time: number; point: Vec2 } | null>(null);

  const syncTransform = useCallback((nextScale: number, nextOffset: Vec2) => {
    scaleRef.current = nextScale;
    offsetRef.current = nextOffset;
    setScale(nextScale);
    setOffset(nextOffset);
  }, []);

  const resetTransform = useCallback(() => {
    syncTransform(MIN_SCALE, { x: 0, y: 0 });
  }, [syncTransform]);

  const goTo = useCallback(
    (nextIndex: number) => {
      if (sources.length === 0) return;
      const clamped = clamp(nextIndex, 0, sources.length - 1);
      if (clamped === index) return;
      resetTransform();
      setIndex(clamped);
    },
    [index, resetTransform, sources.length],
  );

  const goPrev = useCallback(() => {
    goTo(index - 1);
  }, [goTo, index]);

  const goNext = useCallback(() => {
    goTo(index + 1);
  }, [goTo, index]);

  const zoomAt = useCallback(
    (nextScale: number, center: Vec2) => {
      const currentScale = scaleRef.current;
      const currentOffset = offsetRef.current;
      const clamped = clamp(nextScale, MIN_SCALE, MAX_SCALE);

      if (clamped <= MIN_SCALE + 0.001) {
        resetTransform();
        return;
      }

      const viewport = viewportRef.current;
      if (!viewport) {
        syncTransform(clamped, currentOffset);
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const focalX = center.x - rect.left - rect.width / 2;
      const focalY = center.y - rect.top - rect.height / 2;
      const ratio = clamped / currentScale;

      syncTransform(clamped, {
        x: focalX - (focalX - currentOffset.x) * ratio,
        y: focalY - (focalY - currentOffset.y) * ratio,
      });
    },
    [resetTransform, syncTransform],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const viewport = viewportRef.current;
      const center = viewport
        ? {
            x: viewport.getBoundingClientRect().left + viewport.clientWidth / 2,
            y: viewport.getBoundingClientRect().top + viewport.clientHeight / 2,
          }
        : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      zoomAt(scaleRef.current * factor, center);
    },
    [zoomAt],
  );

  const toggleDoubleTap = useCallback(
    (point: Vec2) => {
      if (scaleRef.current > 1.15) {
        resetTransform();
        return;
      }
      zoomAt(DOUBLE_TAP_SCALE, point);
    },
    [resetTransform, zoomAt],
  );

  const registerTap = useCallback(
    (point: Vec2) => {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (
        lastTap &&
        now - lastTap.time < DOUBLE_TAP_MS &&
        pointDistance(lastTap.point, point) < TAP_MOVE_THRESHOLD
      ) {
        lastTapRef.current = null;
        toggleDoubleTap(point);
        return;
      }
      lastTapRef.current = { time: now, point };
    },
    [toggleDoubleTap],
  );

  useEffect(() => {
    const root = document.getElementById('family-root');
    root?.classList.add(IMMERSIVE_CLASS);
    return () => root?.classList.remove(IMMERSIVE_CLASS);
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (isGallery && scaleRef.current <= 1.02) {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault();
          goNext();
          return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault();
          goPrev();
          return;
        }
      }
      if (event.key === '+' || event.key === '=') {
        event.preventDefault();
        zoomBy(ZOOM_STEP);
      }
      if (event.key === '-') {
        event.preventDefault();
        zoomBy(1 / ZOOM_STEP);
      }
      if (event.key === '0') {
        event.preventDefault();
        resetTransform();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev, isGallery, onClose, resetTransform, zoomBy]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(scaleRef.current * factor, { x: event.clientX, y: event.clientY });
    };

    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const handleBackdropClick = () => {
    if (scaleRef.current <= 1.02) onClose();
  };

  if (!activeUrl) return null;

  const content = (
    <div
      role="dialog"
      aria-modal
      aria-label={isGallery ? 'نمایش گالری تصاویر' : 'نمایش تصویر'}
      className={cn(
        'family-portal-surface family-image-lightbox fixed inset-0 z-[250] flex flex-col bg-black',
        fontClassName,
      )}
      onClick={handleBackdropClick}
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label="بستن"
        className="absolute end-4 top-[max(1rem,env(safe-area-inset-top))] z-10 rounded-full border border-white/10 bg-black/45 p-2 text-white/85 backdrop-blur-md transition hover:bg-black/65"
      >
        <X className="h-5 w-5" />
      </button>

      {isGallery && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            disabled={index <= 0}
            aria-label="عکس قبلی"
            className="absolute start-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-2.5 text-white/90 backdrop-blur-md transition enabled:hover:bg-black/65 enabled:active:scale-95 disabled:opacity-35"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            disabled={index >= sources.length - 1}
            aria-label="عکس بعدی"
            className="absolute end-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-white/10 bg-black/45 p-2.5 text-white/90 backdrop-blur-md transition enabled:hover:bg-black/65 enabled:active:scale-95 disabled:opacity-35"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      <div
        ref={viewportRef}
        className="relative min-h-0 flex-1 touch-none overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        onTouchStart={(event) => {
          if (event.touches.length !== 2) return;
          setIsGesturing(true);
          pinchRef.current = {
            distance: touchDistance(event.touches[0], event.touches[1]),
            scale: scaleRef.current,
            center: touchCenter(event.touches[0], event.touches[1]),
            offset: { ...offsetRef.current },
          };
        }}
        onTouchMove={(event) => {
          const pinch = pinchRef.current;
          if (!pinch || event.touches.length !== 2) return;
          event.preventDefault();
          const distance = touchDistance(event.touches[0], event.touches[1]);
          const center = touchCenter(event.touches[0], event.touches[1]);
          const nextScale = clamp(pinch.scale * (distance / pinch.distance), MIN_SCALE, MAX_SCALE);
          zoomAt(nextScale, center);
        }}
        onTouchEnd={() => {
          pinchRef.current = null;
          setIsGesturing(false);
        }}
        onTouchCancel={() => {
          pinchRef.current = null;
          setIsGesturing(false);
        }}
        onPointerDown={(event) => {
          if (event.pointerType === 'mouse' && event.button !== 0) return;
          if (pinchRef.current) return;

          event.currentTarget.setPointerCapture(event.pointerId);
          panRef.current = {
            start: { x: event.clientX, y: event.clientY },
            offset: scaleRef.current > 1 ? { ...offsetRef.current } : { x: 0, y: 0 },
            moved: false,
          };
          if (scaleRef.current <= 1 && isGallery) {
            swipeRef.current = { start: { x: event.clientX, y: event.clientY }, moved: false };
          } else {
            swipeRef.current = null;
          }
          if (scaleRef.current > 1) setIsGesturing(true);
        }}
        onPointerMove={(event) => {
          const pan = panRef.current;
          const swipe = swipeRef.current;
          if (swipe && scaleRef.current <= 1) {
            const dx = event.clientX - swipe.start.x;
            const dy = event.clientY - swipe.start.y;
            if (Math.abs(dx) > 4 || Math.abs(dy) > 4) swipe.moved = true;
          }

          if (!pan || scaleRef.current <= 1) return;

          const dx = event.clientX - pan.start.x;
          const dy = event.clientY - pan.start.y;
          if (Math.abs(dx) > 2 || Math.abs(dy) > 2) pan.moved = true;

          syncTransform(scaleRef.current, {
            x: pan.offset.x + dx,
            y: pan.offset.y + dy,
          });
        }}
        onPointerUp={(event) => {
          const pan = panRef.current;
          const swipe = swipeRef.current;
          panRef.current = null;
          swipeRef.current = null;
          setIsGesturing(false);

          if (swipe && scaleRef.current <= 1 && isGallery) {
            const dx = event.clientX - swipe.start.x;
            const dy = event.clientY - swipe.start.y;
            if (swipe.moved && Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy) * 1.15) {
              if (dx < 0) goNext();
              else goPrev();
              return;
            }
          }

          if (pan && !pan.moved) {
            registerTap({ x: event.clientX, y: event.clientY });
          }
        }}
        onPointerCancel={() => {
          panRef.current = null;
          swipeRef.current = null;
          setIsGesturing(false);
        }}
        onDoubleClick={(event) => {
          event.preventDefault();
          toggleDoubleTap({ x: event.clientX, y: event.clientY });
        }}
      >
        <div className="flex h-full w-full items-center justify-center p-4 pb-20">
          <div
            className={cn(
              'will-change-transform',
              !isGesturing && 'transition-transform duration-200 ease-out',
            )}
            style={{
              transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={activeUrl}
              src={displayUrl ?? activeUrl}
              alt={alt}
              draggable={false}
              className="max-h-[calc(100dvh-7rem)] max-w-[min(100vw-2rem,56rem)] select-none object-contain"
            />
          </div>
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-white/10 bg-black/45 px-3 py-2 text-white/90 backdrop-blur-xl">
          {isGallery && (
            <>
              <span className="min-w-[3.5rem] text-center text-sm font-medium tabular-nums">
                {(index + 1).toLocaleString('fa-IR')} / {sources.length.toLocaleString('fa-IR')}
              </span>
              <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={() => zoomBy(1 / ZOOM_STEP)}
            aria-label="کوچک‌تر"
            className="rounded-full p-2 transition hover:bg-white/10 active:scale-95"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3.25rem] text-center text-sm font-medium tabular-nums">
            {Math.round(scale * 100)}٪
          </span>
          <button
            type="button"
            onClick={() => zoomBy(ZOOM_STEP)}
            aria-label="بزرگ‌تر"
            className="rounded-full p-2 transition hover:bg-white/10 active:scale-95"
          >
            <Plus className="h-4 w-4" />
          </button>
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          <FamilyMediaDownloadButton
            url={activeUrl}
            mediaId={activeMediaId}
            label="ذخیره"
            className="border-0 bg-transparent px-2 py-2 hover:bg-white/10"
          />
          <span className="mx-0.5 h-5 w-px bg-white/15" aria-hidden />
          <button
            type="button"
            onClick={resetTransform}
            aria-label="بازنشانی بزرگ‌نمایی"
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-2 text-xs font-medium transition hover:bg-white/10 active:scale-95"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            تناسب
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return content;
  return createPortal(content, document.body);
}
