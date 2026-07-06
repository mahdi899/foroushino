'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Columns2,
  Loader2,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { rewriteOptimizePreviewUrl } from '@/lib/admin/mediaPreviewUrl';
import type { MediaOptimizePreview, MediaOptimizeVariant } from '@/lib/admin/mediaOptimize';
import { engineLabel, formatBytes } from '@/lib/admin/mediaOptimize';
import { discardGalleryOptimize, rewriteOptimizeAltWithAi } from './actions';

interface MediaOptimizeModalProps {
  preview: MediaOptimizePreview | null;
  initialLabel: string;
  busy: boolean;
  onClose: () => void;
  onConfirmed: (variant: 'original' | 'optimized', alt_fa: string) => void;
  /** Override dialog title (e.g. in-place replace from edit modal). */
  dialogTitle?: string;
  /** Override primary action label. */
  saveLabel?: string;
}

type OverlayMode = 'single' | 'compare';
type CompareLayout = 'side' | 'slider';

/** Fixed overlay — not tied to admin theme tokens (readable on any image). */
const OVERLAY_BG = 'bg-black/85 backdrop-blur-sm';
const OVERLAY_TOGGLE_ACTIVE = 'bg-white text-zinc-900 font-medium';
const OVERLAY_TOGGLE_IDLE = 'text-white/80 hover:bg-white/10 hover:text-white';

function VariantMeta({ variant, className }: { variant: MediaOptimizeVariant; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-2 text-caption text-text-muted', className)} dir="ltr">
      <span>{formatBytes(variant.size)}</span>
      {variant.width && variant.height ? <span>{variant.width}×{variant.height}</span> : <span />}
    </div>
  );
}

function previewSrc(url: string): string {
  return rewriteOptimizePreviewUrl(url);
}

function VariantCard({
  title,
  badge,
  variant,
  selected,
  recommended,
  onSelect,
  onZoom,
}: {
  title: string;
  badge?: string;
  variant: MediaOptimizeVariant;
  selected: boolean;
  recommended?: boolean;
  onSelect: () => void;
  onZoom: () => void;
}) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border text-right transition',
        selected ? 'border-primary ring-2 ring-primary/25' : 'border-border',
      )}
    >
      <div className="group relative aspect-[4/3] bg-zinc-200">
        <button type="button" onClick={onSelect} className="absolute inset-0 z-[1]" aria-label={`انتخاب ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc(variant.preview_url)} alt={title} className="h-full w-full object-contain" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoom();
          }}
          className="absolute left-2 top-2 z-[2] inline-flex items-center gap-1 rounded-lg bg-black/55 px-2 py-1 text-[10px] font-medium text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 focus-visible:opacity-100"
          aria-label={`بزرگ‌نمایی ${title}`}
        >
          <Maximize2 className="h-3.5 w-3.5" />
          بزرگ‌نمایی
        </button>
        {selected && (
          <span className="admin-badge-solid absolute right-2 top-2 z-[2] inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-[10px] font-semibold shadow-sm">
            <Check className="h-3 w-3" />
            انتخاب شده
          </span>
        )}
        {recommended && !selected && (
          <span className="admin-badge-accent absolute right-2 top-2 z-[2] rounded-pill px-2 py-0.5 text-[10px] font-medium shadow-sm">
            پیشنهادی
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="space-y-1 p-3 text-right transition hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-small font-semibold text-primary-dark">{title}</p>
          {badge && (
            <span className="shrink-0 rounded-pill bg-surface-soft px-2 py-0.5 text-[10px] text-text-muted">{badge}</span>
          )}
        </div>
        <VariantMeta variant={variant} />
        <p className="text-[10px] text-text-muted">{variant.mime}</p>
      </button>
    </div>
  );
}

function WipeCompare({
  original,
  optimized,
}: {
  original: MediaOptimizeVariant;
  optimized: MediaOptimizeVariant;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const move = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setPos(pct);
  }, []);

  return (
    <div
      ref={ref}
      className="relative aspect-[4/3] w-full min-h-[50vh] select-none overflow-hidden rounded-xl bg-zinc-200 sm:min-h-[60vh]"
      dir="ltr"
      onMouseMove={(e) => dragging.current && move(e.clientX)}
      onMouseDown={(e) => {
        dragging.current = true;
        move(e.clientX);
      }}
      onMouseUp={() => (dragging.current = false)}
      onMouseLeave={() => (dragging.current = false)}
      onTouchStart={(e) => {
        dragging.current = true;
        move(e.touches[0].clientX);
      }}
      onTouchMove={(e) => dragging.current && move(e.touches[0].clientX)}
      onTouchEnd={() => (dragging.current = false)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={previewSrc(optimized.preview_url)} alt="بهینه‌شده" className="absolute inset-0 h-full w-full object-contain" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewSrc(original.preview_url)} alt="اصلی" className="absolute inset-0 h-full w-full object-contain" />
      </div>
      <div className="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.35)]" style={{ left: `${pos}%` }}>
        <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-primary text-white shadow-lg">
          <SlidersHorizontal className="h-4 w-4" />
        </div>
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-pill bg-black/55 px-2 py-0.5 text-[10px] text-white">اصلی</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-pill bg-black/55 px-2 py-0.5 text-[10px] text-white">بهینه</span>
    </div>
  );
}

function PreviewOverlay({
  preview,
  mode,
  compareLayout,
  singleVariant,
  onCompareLayoutChange,
  onSingleVariantChange,
  onClose,
}: {
  preview: MediaOptimizePreview;
  mode: OverlayMode;
  compareLayout: CompareLayout;
  singleVariant: 'original' | 'optimized';
  onCompareLayoutChange: (layout: CompareLayout) => void;
  onSingleVariantChange: (v: 'original' | 'optimized') => void;
  onClose: () => void;
}) {
  const single = singleVariant === 'original' ? preview.original : preview.optimized;
  const singleLabel = singleVariant === 'original' ? 'اصلی' : 'بهینه‌شده';

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (mode === 'single') {
        if (e.key === 'ArrowLeft') onSingleVariantChange('optimized');
        if (e.key === 'ArrowRight') onSingleVariantChange('original');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose, onSingleVariantChange]);

  return (
    <div
      className={cn('fixed inset-0 z-[70] flex flex-col p-3 sm:p-5', OVERLAY_BG)}
      onClick={onClose}
      role="presentation"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-small font-semibold text-white">
              {mode === 'compare' ? 'مقایسه تصویر' : `بزرگ‌نمایی — ${singleLabel}`}
            </p>
            <p className="text-caption text-white/60">{preview.original_filename}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {mode === 'compare' && (
              <div className="flex rounded-lg border border-white/15 p-0.5">
                <button
                  type="button"
                  onClick={() => onCompareLayoutChange('side')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-caption transition',
                    compareLayout === 'side' ? OVERLAY_TOGGLE_ACTIVE : OVERLAY_TOGGLE_IDLE,
                  )}
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  کنار هم
                </button>
                <button
                  type="button"
                  onClick={() => onCompareLayoutChange('slider')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-caption transition',
                    compareLayout === 'slider' ? OVERLAY_TOGGLE_ACTIVE : OVERLAY_TOGGLE_IDLE,
                  )}
                >
                  <SlidersHorizontal className="h-3.5 w-3.5" />
                  اسلایدر
                </button>
              </div>
            )}
            {mode === 'single' && (
              <div className="flex rounded-lg border border-white/15 p-0.5">
                {(['original', 'optimized'] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onSingleVariantChange(key)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-caption transition',
                      singleVariant === key ? OVERLAY_TOGGLE_ACTIVE : OVERLAY_TOGGLE_IDLE,
                    )}
                  >
                    {key === 'original' ? 'اصلی' : 'بهینه'}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 p-2 text-white hover:bg-white/20"
              aria-label="بستن"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {mode === 'compare' && compareLayout === 'slider' ? (
          <WipeCompare original={preview.original} optimized={preview.optimized} />
        ) : mode === 'compare' ? (
          <div className="grid min-h-0 flex-1 gap-3 sm:grid-cols-2">
            {[
                { key: 'original' as const, label: 'اصلی', variant: preview.original, badge: undefined as string | undefined },
                { key: 'optimized' as const, label: 'بهینه‌شده', variant: preview.optimized, badge: preview.converted_to_webp ? 'WebP' : undefined },
              ].map(({ key, label, variant, badge }) => (
              <div key={key} className="flex min-h-0 flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <p className="text-small font-semibold text-white">{label}</p>
                    {badge && (
                      <span className="rounded-pill bg-white/15 px-2 py-0.5 text-[10px] text-white/90">{badge}</span>
                    )}
                  </div>
                  <VariantMeta variant={variant} className="text-white/70" />
                </div>
                <div className="relative min-h-[40vh] flex-1 overflow-hidden rounded-xl bg-zinc-900/50 sm:min-h-[55vh]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewSrc(variant.preview_url)} alt={label} className="absolute inset-0 h-full w-full object-contain" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-2 flex items-center justify-between gap-2 text-caption text-white/70">
              <VariantMeta variant={single} className="text-white/70" />
              <span>{single.mime}</span>
            </div>
            <div className="relative min-h-[50vh] flex-1 overflow-hidden rounded-xl bg-zinc-900/50 sm:min-h-[65vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewSrc(single.preview_url)} alt={singleLabel} className="absolute inset-0 h-full w-full object-contain" />
            </div>
            <p className="mt-2 text-center text-[10px] text-white/50">← → برای جابجایی بین نسخه‌ها · Esc برای بستن</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function MediaOptimizeModal({
  preview,
  initialLabel,
  busy,
  onClose,
  onConfirmed,
  dialogTitle = 'بهینه‌سازی تصویر',
  saveLabel,
}: MediaOptimizeModalProps) {
  const [variant, setVariant] = useState<'original' | 'optimized'>('optimized');
  const [title, setTitle] = useState('');
  const [alt, setAlt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [overlay, setOverlay] = useState<OverlayMode | null>(null);
  const [compareLayout, setCompareLayout] = useState<CompareLayout>('side');
  const [singleVariant, setSingleVariant] = useState<'original' | 'optimized'>('original');

  useEffect(() => {
    if (preview) {
      setVariant(preview.recommended);
      const label = initialLabel.trim();
      setTitle(label);
      setAlt(label);
      setNotice('');
      setError('');
      setOverlay(null);
    }
  }, [preview, initialLabel]);

  if (!preview) return null;

  const savings = preview.savings_percent;
  const skipped = Boolean(preview.skip_reason);
  const selectedVariant = variant === 'optimized' ? preview.optimized : preview.original;
  const disabled = busy || aiBusy;

  async function handleClose() {
    if (disabled || overlay) return;
    await discardGalleryOptimize(preview!.session_id);
    onClose();
  }

  async function onAiRewrite() {
    setAiBusy(true);
    setError('');
    setNotice('');
    const res = await rewriteOptimizeAltWithAi(
      preview!.original_filename,
      selectedVariant.mime,
      title,
    );
    setAiBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle(res.alt);
    setAlt(res.alt);
    if (!res.aiUsed) {
      setNotice('AI در دسترس نبود — از نام فایل استفاده شد.');
    }
  }

  function onSave() {
    const alt_fa = alt.trim() || title.trim();
    if (!alt_fa) {
      setError('عنوان یا alt را وارد کنید.');
      return;
    }
    setError('');
    onConfirmed(variant, alt_fa);
  }

  function openZoom(which: 'original' | 'optimized') {
    setSingleVariant(which);
    setOverlay('single');
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center admin-overlay p-4"
        onClick={handleClose}
        role="presentation"
      >
        <div
          className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-surface shadow-premium"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-optimize-title"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p id="media-optimize-title" className="text-body font-bold text-primary-dark">
                {dialogTitle}
              </p>
              <p className="mt-1 text-caption text-text-muted">
                {preview.original_filename}
                {!skipped && (
                  <>
                    {' '}
                    · موتور: {engineLabel(preview.engine)}
                    {preview.converted_to_webp && ' · WebP'}
                  </>
                )}
              </p>
            </div>
            <button type="button" onClick={handleClose} disabled={disabled} className="rounded-md p-1 text-text-muted hover:bg-surface-soft" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-y-auto px-5 py-4">
            {skipped ? (
              <p className="mb-4 rounded-lg border border-border bg-surface-soft px-3 py-2 text-small text-text-muted">
                {preview.skip_reason === 'gif'
                  ? 'GIF انیمیشنی بهینه‌سازی نمی‌شود — نسخه اصلی ذخیره می‌شود.'
                  : 'این فرمت قابل بهینه‌سازی خودکار نیست.'}
              </p>
            ) : savings > 0 ? (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2 text-small text-primary-dark">
                <Zap className="h-4 w-4 shrink-0 text-accent" />
                <span>
                  نسخه بهینه <strong>{savings}%</strong> کوچک‌تر است
                  {preview.converted_to_webp && ' · WebP'}.
                </span>
              </div>
            ) : savings < 0 ? (
              <p className="mb-4 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-small text-text-muted">
                نسخه بهینه بزرگ‌تر شد — پیشنهاد: نسخه اصلی را انتخاب کنید.
              </p>
            ) : preview.engine === 'copy' ? (
              <p className="mb-4 rounded-lg border border-border bg-surface-soft px-3 py-2 text-small text-text-muted">
                {preview.engine_note ??
                  'بهینه‌سازی انجام نشد — از تنظیمات → بهینه‌سازی تصویر، reSmush یا TinyPNG را تست کنید.'}
              </p>
            ) : null}

            <div className="mb-3 flex justify-end">
              <button
                type="button"
                disabled={disabled}
                onClick={() => setOverlay('compare')}
                className="btn btn-secondary py-1.5 text-caption"
              >
                <Columns2 className="h-3.5 w-3.5" />
                مقایسه بزرگ
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <VariantCard
                title="اصلی"
                variant={preview.original}
                selected={variant === 'original'}
                onSelect={() => setVariant('original')}
                onZoom={() => openZoom('original')}
              />
              <VariantCard
                title="بهینه‌شده"
                badge={preview.converted_to_webp ? 'WebP' : undefined}
                variant={preview.optimized}
                selected={variant === 'optimized'}
                onSelect={() => setVariant('optimized')}
                onZoom={() => openZoom('optimized')}
                recommended={preview.recommended === 'optimized' && !skipped}
              />
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="field-label" htmlFor="optimize-title">
                  عنوان تصویر
                </label>
                <input
                  id="optimize-title"
                  className="field-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان نمایشی در گالری…"
                  disabled={disabled}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="optimize-alt">
                  alt (سئو و دسترس‌پذیری)
                </label>
                <input
                  id="optimize-alt"
                  className="field-input"
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  placeholder="توضیح تصویر برای موتورهای جستجو…"
                  disabled={disabled}
                />
                <p className="mt-1 text-caption text-text-muted">اگر alt خالی بماند، از عنوان استفاده می‌شود.</p>
              </div>
              <button
                type="button"
                onClick={onAiRewrite}
                disabled={disabled}
                className="btn btn-secondary w-full justify-center py-2 text-small sm:w-auto"
              >
                {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                پیشنهاد عنوان و alt با AI
              </button>
            </div>

            {notice && <p className="mt-3 text-small text-text-muted">{notice}</p>}
            {error && <p className="mt-3 text-small text-error">{error}</p>}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-border px-5 py-4">
            <button
              type="button"
              disabled={disabled}
              onClick={onSave}
              className="btn btn-primary flex-1 justify-center py-2 text-small"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saveLabel ?? `ذخیره نسخه ${variant === 'optimized' ? 'بهینه' : 'اصلی'}`}
            </button>
            <button type="button" disabled={disabled} onClick={handleClose} className="btn btn-secondary justify-center py-2 text-small">
              انصراف
            </button>
          </div>
        </div>
      </div>

      {overlay && (
        <PreviewOverlay
          preview={preview}
          mode={overlay}
          compareLayout={compareLayout}
          singleVariant={singleVariant}
          onCompareLayoutChange={setCompareLayout}
          onSingleVariantChange={setSingleVariant}
          onClose={() => setOverlay(null)}
        />
      )}
    </>
  );
}
