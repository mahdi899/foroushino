'use client';

import { useEffect, useState } from 'react';
import { Copy, ExternalLink, Loader2, Maximize2, Sparkles, Trash2, Wand2, X } from 'lucide-react';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';
import {
  confirmGalleryMediaReplace,
  discardGalleryOptimize,
  previewGalleryMediaOptimizeExisting,
  removeGalleryMedia,
  rewriteMediaAltWithAi,
  saveMediaAlt,
} from './actions';
import { MediaOptimizeModal } from './MediaOptimizeModal';
import type { MediaOptimizePreview } from '@/lib/admin/mediaOptimize';
import { MediaPreview } from '@/components/admin/MediaPreview';
import { MediaZoomOverlay } from '@/components/admin/MediaZoomOverlay';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface MediaEditModalProps {
  item: AdminMediaItem | null;
  onClose: () => void;
  onSaved: (item?: AdminMediaItem) => void;
  onTrashed?: () => void;
}

function isOptimizableImage(item: AdminMediaItem): boolean {
  const mime = item.mime?.toLowerCase() ?? '';
  if (mime) {
    return mime.startsWith('image/') && mime !== 'image/gif';
  }
  return /\.(jpe?g|png|webp)$/i.test(item.url);
}

export function MediaEditModal({ item, onClose, onSaved, onTrashed }: MediaEditModalProps) {
  const [title, setTitle] = useState('');
  const [alt, setAlt] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmOptimize, setConfirmOptimize] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizePreview, setOptimizePreview] = useState<MediaOptimizePreview | null>(null);
  const [confirmingOptimize, setConfirmingOptimize] = useState(false);

  useEffect(() => {
    const label = item?.label ?? '';
    setTitle(label);
    setAlt(label);
    setPreviewUrl(item?.url ?? '');
    setError('');
    setNotice('');
    setCopied(false);
    setZoomOpen(false);
    setConfirmDelete(false);
    setConfirmOptimize(false);
    setOptimizePreview(null);
  }, [item]);

  if (!item) return null;

  const canOptimize = isOptimizableImage(item);

  async function onSave() {
    const nextAlt = alt.trim() || title.trim();
    if (!nextAlt) {
      setError('عنوان یا alt را وارد کنید.');
      return;
    }
    setBusy(true);
    setError('');
    const res = await saveMediaAlt(item!.id, nextAlt);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onSaved({ ...item!, label: nextAlt });
    onClose();
  }

  async function onAiRewrite() {
    setBusy(true);
    setError('');
    setNotice('');
    const res = await rewriteMediaAltWithAi(item!.id, item!.label, item!.mime ?? undefined, title);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setTitle(res.alt);
    setAlt(res.alt);
    if (!res.aiUsed) {
      setNotice('AI در دسترس نبود — alt از عنوان تنظیم شد.');
    }
    onSaved({ ...item!, label: res.alt });
  }

  async function onDeleteConfirm() {
    setBusy(true);
    setError('');
    const res = await removeGalleryMedia(item!.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onTrashed?.();
    onSaved();
    onClose();
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item!.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('کپی لینک ناموفق بود.');
    }
  }

  async function startOptimize() {
    setConfirmOptimize(false);
    setOptimizing(true);
    setError('');
    setNotice('');
    const res = await previewGalleryMediaOptimizeExisting(item!.id);
    setOptimizing(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOptimizePreview(res.preview);
  }

  async function onOptimizeClose() {
    if (optimizePreview) {
      await discardGalleryOptimize(optimizePreview.session_id);
    }
    setOptimizePreview(null);
  }

  async function onOptimizeConfirm(variant: 'original' | 'optimized', alt_fa: string) {
    if (!optimizePreview) return;
    setConfirmingOptimize(true);
    setError('');
    const res = await confirmGalleryMediaReplace({
      media_id: item!.id,
      session_id: optimizePreview.session_id,
      variant,
      alt_fa,
    });
    setConfirmingOptimize(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOptimizePreview(null);
    setTitle(res.item.label);
    setAlt(res.item.label);
    setPreviewUrl(`${res.item.url}${res.item.url.includes('?') ? '&' : '?'}v=${Date.now()}`);
    setNotice(
      variant === 'optimized' && optimizePreview.savings_percent > 0
        ? `تصویر بهینه جایگزین شد (${optimizePreview.savings_percent}% کاهش حجم).`
        : 'تصویر جایگزین شد.',
    );
    onSaved(res.item);
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center admin-overlay p-4"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-premium"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="media-edit-title"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p id="media-edit-title" className="text-small font-semibold text-primary-dark">
              مدیریت تصویر
            </p>
            <button type="button" onClick={onClose} className="admin-icon-btn" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-4">
            <div className="mx-auto mb-4 w-full max-w-sm">
              <MediaPreview
                src={previewUrl || item.url}
                persistSrc={item.persistSrc}
                legacyPath={item.legacyPath}
                alt={alt || title || item.label}
              />

              <div className="mt-3 flex flex-nowrap items-stretch gap-2">
                <button
                  type="button"
                  onClick={() => setZoomOpen(true)}
                  className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                >
                  <Maximize2 className="h-3.5 w-3.5 shrink-0" />
                  بزرگ‌نمایی
                </button>
                {canOptimize && (
                  <button
                    type="button"
                    disabled={busy || optimizing || confirmingOptimize}
                    onClick={() => setConfirmOptimize(true)}
                    className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                  >
                    {optimizing ? (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5 shrink-0" />
                    )}
                    بهینه‌سازی
                  </button>
                )}
                <a
                  href={resolveMediaUrl(previewUrl || item.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  باز کردن
                </a>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                  {copied ? 'کپی شد' : 'کپی لینک'}
                </button>
              </div>
            </div>

            {confirmOptimize && (
              <div className="mb-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-4">
                <p className="text-small font-medium text-primary-dark">تصویر بهینه‌سازی شود؟</p>
                <p className="mt-1.5 text-caption leading-relaxed text-text-muted">
                  نسخه قبل و بعد مقایسه می‌شود؛ پس از تأیید، فایل فعلی با نسخه انتخابی جایگزین می‌شود (همان URL).
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmOptimize(false)}
                    disabled={optimizing}
                    className="btn btn-secondary flex-1 justify-center py-2 text-small"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={() => void startOptimize()}
                    disabled={optimizing}
                    className="btn btn-primary flex-1 justify-center py-2 text-small"
                  >
                    {optimizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    شروع بهینه‌سازی
                  </button>
                </div>
              </div>
            )}

            {confirmDelete ? (
              <div className="mb-3 rounded-lg border border-error/30 bg-error/5 p-4">
                <p className="text-small font-medium text-text">این تصویر به سطل زباله منتقل شود؟</p>
                <p className="mt-1.5 text-caption leading-relaxed text-text-muted">
                  تا ۲۴ ساعت در سطل زباله می‌ماند و قابل بازیابی است؛ بعد از آن برای همیشه حذف می‌شود.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    disabled={busy}
                    className="btn btn-secondary flex-1 justify-center py-2 text-small"
                  >
                    انصراف
                  </button>
                  <button
                    type="button"
                    onClick={onDeleteConfirm}
                    disabled={busy}
                    className="btn flex-1 justify-center bg-error py-2 text-small text-white hover:bg-error/90"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'انتقال به سطل زباله'}
                  </button>
                </div>
              </div>
            ) : (
              !confirmOptimize && (
                <div className="mb-3 grid gap-3">
                  <div>
                    <label className="field-label" htmlFor="media-title">
                      عنوان تصویر
                    </label>
                    <input
                      id="media-title"
                      className="field-input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="عنوان نمایشی در گالری…"
                    />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="media-alt">
                      alt (سئو و دسترس‌پذیری)
                    </label>
                    <input
                      id="media-alt"
                      className="field-input"
                      value={alt}
                      onChange={(e) => setAlt(e.target.value)}
                      placeholder="توضیح تصویر برای موتورهای جستجو…"
                    />
                    <p className="mt-1 text-caption text-text-muted">اگر alt خالی بماند، از عنوان استفاده می‌شود.</p>
                  </div>
                </div>
              )
            )}

            {notice && <p className="mb-2 text-small text-success">{notice}</p>}
            {error && <p className="mb-2 text-small text-error">{error}</p>}

            {!confirmDelete && !confirmOptimize && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={onSave} disabled={busy || optimizing} className="btn btn-primary flex-1 justify-center py-2 text-small">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره تغییرات'}
                </button>
                <button type="button" onClick={onAiRewrite} disabled={busy || optimizing} className="btn btn-secondary justify-center py-2 text-small">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  AI
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  disabled={busy || optimizing}
                  className="btn btn-secondary justify-center py-2 text-small text-error"
                >
                  <Trash2 className="h-4 w-4" />
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        {zoomOpen && (
          <MediaZoomOverlay
            src={previewUrl || item.url}
            persistSrc={item.persistSrc}
            legacyPath={item.legacyPath}
            alt={alt || title || item.label}
            onClose={() => setZoomOpen(false)}
          />
        )}
      </div>

      <MediaOptimizeModal
        preview={optimizePreview}
        initialLabel={alt.trim() || title.trim() || item.label}
        busy={confirmingOptimize}
        onClose={onOptimizeClose}
        onConfirmed={(variant, alt_fa) => void onOptimizeConfirm(variant, alt_fa)}
        dialogTitle="مقایسه قبل و بعد"
        saveLabel="جایگزینی تصویر"
      />
    </>
  );
}
