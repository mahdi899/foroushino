'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Copy, ExternalLink, X } from 'lucide-react';
import type { UnifiedMediaItem } from '@/lib/admin/unifiedGallery';

interface StaticMediaModalProps {
  item: UnifiedMediaItem | null;
  onClose: () => void;
}

export function StaticMediaModal({ item, onClose }: StaticMediaModalProps) {
  const [copied, setCopied] = useState(false);

  if (!item || item.kind !== 'static') return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center admin-overlay p-4" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-xl bg-surface shadow-premium" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-small font-semibold text-primary-dark">جزئیات تصویر</p>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative mx-auto mb-4 aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-surface-soft">
            <Image src={item.src} alt={item.label} fill sizes="400px" className="object-contain" unoptimized />
          </div>
          <p className="field-label">عنوان</p>
          <p className="mb-3 text-small text-text">{item.label}</p>
          <p className="field-label">دسته</p>
          <p className="mb-3 text-small text-text-muted">{item.category}</p>
          <p className="mb-4 text-caption text-text-muted">
            این تصویر بخشی از assets سایت است. برای حذف یا جایگزینی باید فایل در پروژه ویرایش شود.
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={copyUrl} className="btn btn-secondary py-1.5 text-caption">
              <Copy className="h-3.5 w-3.5" />
              {copied ? 'کپی شد' : 'کپی آدرس'}
            </button>
            <a href={item.src} target="_blank" rel="noopener noreferrer" className="btn btn-secondary py-1.5 text-caption">
              <ExternalLink className="h-3.5 w-3.5" />
              باز کردن
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
