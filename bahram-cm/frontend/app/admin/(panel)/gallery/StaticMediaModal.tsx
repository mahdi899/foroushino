'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink, Maximize2, X } from 'lucide-react';
import type { UnifiedMediaItem } from '@/lib/admin/unifiedGallery';
import { MediaPreview } from '@/components/admin/MediaPreview';
import { MediaZoomOverlay } from '@/components/admin/MediaZoomOverlay';
import { inferAdminMediaKind } from '@/lib/admin/mediaKind';
import { resolveMediaUrl } from '@/lib/mediaUrl';

interface StaticMediaModalProps {
  item: UnifiedMediaItem | null;
  onClose: () => void;
}

export function StaticMediaModal({ item, onClose }: StaticMediaModalProps) {
  const [copied, setCopied] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);

  const mediaKind = useMemo(
    () => (item ? inferAdminMediaKind(item.src, item.mime) : 'image'),
    [item],
  );
  const mediaKindLabel =
    mediaKind === 'video' ? 'ویدیو' : mediaKind === 'audio' ? 'صوت' : mediaKind === 'image' ? 'تصویر' : 'رسانه';

  if (!item || item.kind !== 'static') return null;

  const displayUrl = resolveMediaUrl(item.src);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item!.persistSrc);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center admin-overlay p-4" onClick={onClose}>
        <div
          className="w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-premium"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-small font-semibold text-primary-dark">مدیریت {mediaKindLabel}</p>
            <button type="button" onClick={onClose} className="admin-icon-btn" aria-label="بستن">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="p-4">
            <div className="mx-auto mb-4 w-full max-w-sm">
              <MediaPreview
                src={item.src}
                persistSrc={item.persistSrc}
                alt={item.label}
                mime={item.mime}
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
                <a
                  href={displayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                >
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  باز کردن
                </a>
                <button
                  type="button"
                  onClick={() => void copyUrl()}
                  className="btn btn-secondary min-w-0 flex-1 justify-center py-1.5 text-caption whitespace-nowrap"
                >
                  <Copy className="h-3.5 w-3.5 shrink-0" />
                  {copied ? 'کپی شد' : 'کپی لینک'}
                </button>
              </div>
            </div>

            <p className="field-label">عنوان</p>
            <p className="mb-3 text-small text-text">{item.label}</p>
            <p className="field-label">دسته</p>
            <p className="mb-3 text-small text-text-muted">{item.category}</p>
            <p className="text-caption leading-relaxed text-text-muted">
              این فایل بخشی از assets ثابت سایت است. برای حذف یا جایگزینی باید فایل در پروژه یا storage ویرایش شود.
            </p>
          </div>
        </div>
      </div>

      {zoomOpen && (
        <MediaZoomOverlay
          src={item.src}
          persistSrc={item.persistSrc}
          alt={item.label}
          mime={item.mime}
          onClose={() => setZoomOpen(false)}
        />
      )}
    </>
  );
}
