'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, X } from 'lucide-react';
import { MediaThumb } from '@/components/admin/MediaThumb';
import { inferAdminMediaKind } from '@/lib/admin/mediaKind';
import { cn } from '@/lib/cn';

type MediaZoomOverlayProps = {
  src: string;
  persistSrc: string;
  legacyPath?: string | null;
  alt: string;
  mime?: string | null;
  onClose: () => void;
};

const ZOOM_MIN = 25;
const ZOOM_MAX = 400;
const ZOOM_STEP = 25;

function clampZoom(value: number): number {
  return Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(value)));
}

function fitZoomPercent(
  naturalW: number,
  naturalH: number,
  viewportW: number,
  viewportH: number,
): number {
  if (!naturalW || !naturalH) return 100;
  const pad = 48;
  const fit = Math.min((viewportW - pad) / naturalW, (viewportH - pad) / naturalH);
  return clampZoom(fit * 100);
}

export function MediaZoomOverlay({
  src,
  persistSrc,
  legacyPath,
  alt,
  mime,
  onClose,
}: MediaZoomOverlayProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(100);
  const mediaKind = useMemo(() => inferAdminMediaKind(src, mime), [src, mime]);

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
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const displayW = natural.w ? (natural.w * zoom) / 100 : undefined;
  const displayH = natural.h ? (natural.h * zoom) / 100 : undefined;

  if (mediaKind === 'video' || mediaKind === 'audio') {
    return (
      <div
        className="fixed inset-0 z-[60] flex flex-col bg-black/92"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-small font-medium text-white/90">{alt}</p>
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
          className="flex min-h-0 flex-1 items-center justify-center p-6"
          onClick={(event) => event.stopPropagation()}
        >
          <MediaThumb
            src={src}
            persistSrc={persistSrc}
            legacyPath={legacyPath}
            alt={alt}
            mime={mime}
            controls
            className={cn(
              mediaKind === 'video'
                ? 'max-h-[min(80vh,720px)] w-full max-w-5xl rounded-lg bg-black object-contain'
                : 'w-full max-w-xl',
            )}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-black/92"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-small font-medium text-white/90">بزرگ‌نمایی</p>
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
          <MediaThumb
            src={src}
            persistSrc={persistSrc}
            legacyPath={legacyPath}
            alt={alt}
            mime={mime}
            onLoad={(event) => applyFitZoom(event.currentTarget as HTMLImageElement)}
            className={cn('block max-w-none object-contain')}
            style={{
              width: displayW,
              height: displayH,
              maxWidth: 'none',
              maxHeight: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
