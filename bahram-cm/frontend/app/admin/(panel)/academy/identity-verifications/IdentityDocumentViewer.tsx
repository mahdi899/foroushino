'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, RotateCcw, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/cn';

type IdentityDocumentViewerProps = {
  src: string;
  label: string;
  isVideo?: boolean;
  mimeType?: string | null;
};

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));
}

function fitZoomPercent(naturalW: number, naturalH: number, viewportW: number, viewportH: number): number {
  if (!naturalW || !naturalH) return 100;
  const pad = 48;
  const fit = Math.min((viewportW - pad) / naturalW, (viewportH - pad) / naturalH);
  return clampZoom(fit * 100);
}

export function IdentityDocumentViewer({ src, label, isVideo = false }: IdentityDocumentViewerProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="relative">
        {isVideo ? (
          <video controls className="max-h-80 w-full rounded-lg bg-black" src={src} />
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="block w-full cursor-zoom-in rounded-lg text-start"
            aria-label={`بزرگ‌نمایی ${label}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={label} className="max-h-80 max-w-full rounded-lg object-contain" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/65 px-3 py-1.5 text-caption font-medium text-white shadow-soft backdrop-blur-sm hover:bg-black/80"
        >
          {isVideo ? <Maximize2 className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
          {isVideo ? 'تمام‌صفحه' : 'بزرگ‌نمایی'}
        </button>
      </div>

      {open ? (
        isVideo ? (
          <VideoLightbox src={src} label={label} onClose={() => setOpen(false)} />
        ) : (
          <ImageZoomLightbox src={src} label={label} onClose={() => setOpen(false)} />
        )
      ) : null}
    </>
  );
}

function VideoLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/92" onClick={onClose} role="presentation">
      <div
        className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-small font-medium text-white/90">{label}</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="بستن"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <video
          controls
          autoPlay
          className="max-h-[min(85vh,900px)] w-full max-w-5xl rounded-lg bg-black object-contain"
          src={src}
        />
      </div>
    </div>
  );
}

function ImageZoomLightbox({ src, label, onClose }: { src: string; label: string; onClose: () => void }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(100);

  const applyFitZoom = useCallback((img: HTMLImageElement) => {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    const viewport = viewportRef.current;
    if (!viewport) {
      setZoom(100);
      return;
    }
    setZoom(fitZoomPercent(w, h, viewport.clientWidth, viewport.clientHeight));
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === '+' || event.key === '=') setZoom((prev) => clampZoom(prev + ZOOM_STEP));
      if (event.key === '-') setZoom((prev) => clampZoom(prev - ZOOM_STEP));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const displayW = natural.w ? (natural.w * zoom) / 100 : undefined;
  const displayH = natural.h ? (natural.h * zoom) / 100 : undefined;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/92" onClick={onClose} role="presentation">
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-small font-medium text-white/90">{label}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((prev) => clampZoom(prev - ZOOM_STEP))}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="کاهش بزرگ‌نمایی"
          >
            <Minus className="h-4 w-4" />
          </button>
          <label className="flex items-center gap-2 text-caption text-white/75">
            <span className="hidden sm:inline">بزرگ‌نمایی</span>
            <input
              type="range"
              min={ZOOM_MIN}
              max={ZOOM_MAX}
              step={ZOOM_STEP}
              value={zoom}
              onChange={(event) => setZoom(clampZoom(Number(event.target.value)))}
              className="w-28 accent-accent sm:w-36"
              aria-label="درصد بزرگ‌نمایی"
            />
            <span className="min-w-[3.25rem] tabular-nums text-white">{zoom}٪</span>
          </label>
          <button
            type="button"
            onClick={() => setZoom((prev) => clampZoom(prev + ZOOM_STEP))}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="افزایش بزرگ‌نمایی"
          >
            <Plus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setZoom(100)}
            className="rounded-md px-2 py-1 text-caption text-white/80 hover:bg-white/10 hover:text-white"
          >
            100٪
          </button>
          <button
            type="button"
            onClick={() => {
              if (!natural.w || !natural.h || !viewportRef.current) return;
              setZoom(
                fitZoomPercent(
                  natural.w,
                  natural.h,
                  viewportRef.current.clientWidth,
                  viewportRef.current.clientHeight,
                ),
              );
            }}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-caption text-white/80 hover:bg-white/10 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            تناسب
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="بستن"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="min-h-0 flex-1 overflow-auto p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex min-h-full min-w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={label}
            onLoad={(event) => applyFitZoom(event.currentTarget)}
            className={cn('block max-w-none object-contain')}
            style={{
              width: displayW,
              height: displayH,
              maxWidth: 'none',
              maxHeight: 'none',
            }}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
