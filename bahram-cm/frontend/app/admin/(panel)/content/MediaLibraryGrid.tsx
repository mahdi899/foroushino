'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Search, Sparkles, Trash2, Upload } from 'lucide-react';
import { cn, toFa } from '@/lib/utils';
import { MediaThumb } from '@/components/admin/MediaThumb';
import {
  buildUnifiedGallery,
  findUnifiedByPersistSrc,
  type UnifiedMediaItem,
} from '@/lib/admin/unifiedGallery';
import type { MediaOptimizePreview } from '@/lib/admin/mediaOptimize';
import { filenameToFallbackAlt } from '@/lib/ai/mediaAlt';
import type { AdminMediaItem, MediaPickMeta } from '@/lib/admin/mediaTypes';
import { confirmGalleryUpload, discardGalleryOptimize, previewGalleryOptimize } from '../gallery/actions';
import { MediaOptimizeModal } from '../gallery/MediaOptimizeModal';
import { MediaTrashModal, useMediaTrashCount } from '../gallery/MediaTrashModal';

interface MediaLibraryGridProps {
  uploaded: AdminMediaItem[];
  mode: 'pick' | 'manage';
  selectedUrl?: string;
  onSelect?: (url: string, label: string, meta?: MediaPickMeta) => void;
  onManage?: (item: UnifiedMediaItem) => void;
  onUploaded?: () => void;
  showAiGenerate?: boolean;
  onAiGenerate?: () => void;
  aiLoading?: boolean;
  className?: string;
  gridClassName?: string;
  /** Server-side pagination + search (gallery page). */
  paginated?: {
    page: number;
    lastPage: number;
    total: number;
    search: string;
    loading?: boolean;
    error?: string;
    onSearchChange: (q: string) => void;
    onPageChange: (page: number) => void;
  };
  /** Bump to refresh trash badge count (e.g. after delete). */
  trashRefreshSignal?: number;
  /** `above-card`: toolbar sits outside the white card (gallery page). */
  toolbarPlacement?: 'inside' | 'above-card';
}

/** Rough ETA from file size — API has no byte progress. */
function estimateOptimizeDurationMs(sizeBytes: number): number {
  const mb = sizeBytes / (1024 * 1024);
  return Math.min(35000, Math.max(5000, 4000 + mb * 5500));
}

export function MediaLibraryGrid({
  uploaded,
  mode,
  selectedUrl,
  onSelect,
  onManage,
  onUploaded,
  showAiGenerate,
  onAiGenerate,
  aiLoading,
  className,
  gridClassName,
  paginated,
  trashRefreshSignal = 0,
  toolbarPlacement = 'inside',
}: MediaLibraryGridProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressStartedAtRef = useRef(0);
  const progressEstimateRef = useRef(8000);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [optimizePreview, setOptimizePreview] = useState<MediaOptimizePreview | null>(null);
  const [optimizeAlt, setOptimizeAlt] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [trashOpen, setTrashOpen] = useState(false);
  const { count: trashCount, refresh: refreshTrashCount } = useMediaTrashCount(trashRefreshSignal);

  const items = useMemo(() => buildUnifiedGallery(uploaded), [uploaded]);
  const filtered = items;
  const selected = selectedUrl ? findUnifiedByPersistSrc(items, selectedUrl) : undefined;

  function clearUploadProgressTimer() {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  }

  function startUploadProgress(file: File) {
    clearUploadProgressTimer();
    const estimate = estimateOptimizeDurationMs(file.size);
    progressEstimateRef.current = estimate;
    progressStartedAtRef.current = Date.now();
    setUploadProgress(2);
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - progressStartedAtRef.current;
      const t = Math.min(elapsed / estimate, 1);
      const eased = 1 - (1 - t) ** 2.4;
      setUploadProgress(Math.min(92, 2 + eased * 90));
    }, 80);
  }

  function finishUploadProgress() {
    clearUploadProgressTimer();
    setUploadProgress(100);
    window.setTimeout(() => setUploadProgress(0), 400);
  }

  function resetUploadProgress() {
    clearUploadProgressTimer();
    setUploadProgress(0);
  }

  useEffect(() => () => clearUploadProgressTimer(), []);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('فقط فایل تصویری مجاز است.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setUploading(true);
    setUploadError('');
    startUploadProgress(file);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const previewRes = await previewGalleryOptimize(fd);
      const altSuggestion = filenameToFallbackAlt(file.name, file.name);
      if (!previewRes.ok) {
        setUploadError(
          previewRes.error ||
            'بهینه‌سازی تصویر ناموفق بود. بک‌اند Laravel را بررسی کنید (php artisan serve --port=8010).',
        );
        resetUploadProgress();
        return;
      }
      finishUploadProgress();
      setOptimizeAlt(altSuggestion);
      setOptimizePreview(previewRes.preview);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'بهینه‌سازی ناموفق بود.');
      resetUploadProgress();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function onOptimizeConfirm(variant: 'original' | 'optimized', alt_fa: string) {
    if (!optimizePreview) return;
    setConfirming(true);
    setUploadError('');
    const res = await confirmGalleryUpload({
      session_id: optimizePreview.session_id,
      variant,
      alt_fa,
    });
    setConfirming(false);
    if (!res.ok) {
      setUploadError(res.error);
      return;
    }
    setOptimizePreview(null);
    onUploaded?.();
    if (mode === 'pick' && onSelect) {
      onSelect(res.item.persistSrc, res.item.label, {
        persistSrc: res.item.persistSrc,
        width: res.item.width,
        height: res.item.height,
      });
    }
  }

  function onOptimizeClose() {
    if (optimizePreview) {
      void discardGalleryOptimize(optimizePreview.session_id);
    }
    setOptimizePreview(null);
  }

  function onItemClick(item: UnifiedMediaItem) {
    if (mode === 'pick' && onSelect) {
      onSelect(item.persistSrc, item.label, {
        persistSrc: item.persistSrc,
        width: item.adminItem?.width,
        height: item.adminItem?.height,
      });
      return;
    }
    onManage?.(item);
  }

  const toolbarBlock = (
    <div
      className={cn(
        toolbarPlacement === 'above-card' ? 'mb-4' : 'border-b border-border px-4 py-3',
      )}
    >
      <div
        className={cn(
          'admin-media-toolbar flex flex-col gap-2.5 sm:flex-row sm:items-center',
          toolbarPlacement === 'inside' && 'mb-3',
        )}
      >
        {paginated && (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" aria-hidden />
            <input
              type="search"
              value={paginated.search}
              onChange={(e) => paginated.onSearchChange(e.target.value)}
              placeholder="جستجو در عنوان یا توضیحات…"
              className="field-input field-input--icon-start w-full border-transparent bg-surface text-small shadow-none focus:border-primary/30"
            />
          </div>
        )}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <label
            className={cn(
              'admin-upload-btn btn btn-primary relative min-w-[9.5rem] justify-center overflow-hidden px-6 py-2.5 text-small shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]',
              uploading && 'is-uploading pointer-events-none',
            )}
          >
            <span
              aria-hidden
              className="absolute inset-y-0 left-0 bg-surface/25 transition-[width] duration-150 ease-out"
              style={{ width: uploading ? `${uploadProgress}%` : '0%' }}
            />
            <span className="relative z-10 flex items-center gap-2">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? 'بهینه‌سازی…' : 'آپلود تصویر'}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,.jpg,.jpeg,.png,.webp,.heic"
              className="hidden"
              onChange={onFile}
              disabled={uploading}
            />
          </label>
          {showAiGenerate && onAiGenerate && (
            <button
              type="button"
              onClick={onAiGenerate}
              disabled={aiLoading}
              className="btn btn-secondary shrink-0 justify-center px-4 py-2.5 text-caption"
            >
              {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              تولید AI
            </button>
          )}
        </div>
      </div>
      {uploadError && <p className="mt-2 text-caption text-error">{uploadError}</p>}
      {mode === 'manage' && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-caption text-text-muted">روی هر تصویر کلیک کنید — ویرایش alt، عنوان یا حذف</p>
          <button
            type="button"
            onClick={() => setTrashOpen(true)}
            className="relative inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-caption text-text-muted transition hover:bg-surface-soft hover:text-text"
            aria-label="سطل زباله"
          >
            <Trash2 className="h-4 w-4" />
            سطل زباله
            {trashCount > 0 && (
              <span className="absolute -left-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-surface" />
            )}
          </button>
        </div>
      )}
    </div>
  );

  const gridBody = (
    <>
      {paginated?.loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          {paginated?.error ? (
            <>
              <p className="text-small text-error">{paginated.error}</p>
              <p className="mt-2 text-caption text-text-muted">
                اگر تازه به‌روزرسانی کرده‌اید، migration بک‌اند را اجرا کنید:{' '}
                <code className="rounded bg-surface-soft px-1">php artisan migrate</code>
              </p>
            </>
          ) : (
            <p className="text-small text-text-muted">
              {paginated?.search.trim() ? 'نتیجه‌ای برای جستجو یافت نشد.' : 'هنوز تصویری آپلود نشده.'}
            </p>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
            gridClassName,
          )}
        >
          {filtered.map((item) => {
            const isSelected = selected?.key === item.key;
            return (
              <button
                key={item.key}
                type="button"
                title={item.label}
                onClick={() => onItemClick(item)}
                className={cn(
                  'group relative aspect-square overflow-hidden rounded-lg border bg-surface-soft text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  isSelected ? 'border-accent ring-2 ring-accent/30' : 'border-border hover:border-primary/40 hover:ring-2 hover:ring-primary/15',
                )}
              >
                <div
                  className="relative aspect-square overflow-hidden bg-surface-soft"
                  style={{
                    backgroundImage:
                      'linear-gradient(45deg,#ececee 25%,transparent 25%),linear-gradient(-45deg,#ececee 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ececee 75%),linear-gradient(-45deg,transparent 75%,#ececee 75%)',
                    backgroundSize: '12px 12px',
                    backgroundPosition: '0 0,0 6px,6px -6px,-6px 0',
                  }}
                >
                  <MediaThumb
                    src={item.src}
                    persistSrc={item.persistSrc}
                    legacyPath={item.adminItem?.legacyPath}
                    alt={item.label}
                    className="absolute inset-0 h-full w-full object-contain p-2"
                  />
                </div>
                <div className="absolute inset-x-0 bottom-0 z-[5] bg-black/75 px-1.5 py-1">
                  <p className="truncate admin-text-caption text-white">{item.label}</p>
                </div>
                {isSelected && mode === 'pick' && (
                  <span className="absolute inset-0 z-[15] flex items-center justify-center bg-primary/35">
                    <Check className="h-6 w-6 text-white" />
                  </span>
                )}
                {mode === 'manage' && (
                  <span className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/45 admin-text-meta font-semibold text-white opacity-0 transition duration-200 group-hover:opacity-100">
                    مدیریت
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {paginated && !paginated.loading && paginated.total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
          <p className="text-caption text-text-muted">
            {toFa(paginated.total)} تصویر
            {paginated.lastPage > 1 && (
              <>
                {' '}
                — صفحه {toFa(paginated.page)} از {toFa(paginated.lastPage)}
              </>
            )}
          </p>
          {paginated.lastPage > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={paginated.page <= 1}
                onClick={() => paginated.onPageChange(paginated.page - 1)}
                className="btn btn-secondary py-1.5 text-caption disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
                قبلی
              </button>
              <button
                type="button"
                disabled={paginated.page >= paginated.lastPage}
                onClick={() => paginated.onPageChange(paginated.page + 1)}
                className="btn btn-secondary py-1.5 text-caption disabled:opacity-40"
              >
                بعدی
                <ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className={className}>
      {toolbarPlacement === 'above-card' && toolbarBlock}

      <div className={cn(toolbarPlacement === 'above-card' && 'card overflow-hidden')}>
        {toolbarPlacement === 'inside' && toolbarBlock}
        {gridBody}
      </div>

      <MediaOptimizeModal
        preview={optimizePreview}
        initialLabel={optimizeAlt}
        busy={confirming}
        onClose={onOptimizeClose}
        onConfirmed={onOptimizeConfirm}
      />
      {mode === 'manage' && (
        <MediaTrashModal
          open={trashOpen}
          onClose={() => setTrashOpen(false)}
          onChanged={() => {
            refreshTrashCount();
            onUploaded?.();
          }}
        />
      )}
    </div>
  );
}
