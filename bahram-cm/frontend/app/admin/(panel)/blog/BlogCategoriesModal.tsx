'use client';

import { useEffect } from 'react';
import { FolderTree, X } from 'lucide-react';
import type { ApiCategory } from '@/lib/api/types';
import { BlogCategoriesManager } from './BlogCategoriesManager';

interface BlogCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  onCategoriesChange?: (categories: ApiCategory[]) => void;
}

export function BlogCategoriesModal({ open, onClose, onCategoriesChange }: BlogCategoriesModalProps) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="flex items-center gap-2 font-semibold text-primary-dark">
              <FolderTree className="h-4 w-4" />
              دسته‌بندی مجله
            </p>
            <p className="mt-0.5 text-caption text-text-muted">افزودن یا حذف دسته‌های مقالات</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 py-4">
          <BlogCategoriesManager compact onCategoriesChange={onCategoriesChange} />
        </div>
        <div className="border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} className="btn btn-secondary w-full px-4 py-2 text-small">
            بستن
          </button>
        </div>
      </div>
    </div>
  );
}
