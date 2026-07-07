'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { resolveMediaUrl } from '@/lib/mediaUrl';
import { findUnifiedByPersistSrc } from '@/lib/admin/unifiedGallery';
import type { MediaPickMeta } from '@/lib/admin/mediaTypes';
import { listGalleryMediaPage } from '../gallery/actions';
import { MediaLibraryGrid } from './MediaLibraryGrid';

interface ImageGalleryModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (url: string, label: string, meta?: MediaPickMeta) => void;
  title?: string;
  alt?: string;
}

export function ImageGalleryModal({
  open,
  onClose,
  value,
  onSelect,
  title = 'کتابخانه رسانه',
  alt,
}: ImageGalleryModalProps) {
  const [uploaded, setUploaded] = useState<AdminMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadPage = useCallback(async (p: number, q: string) => {
    setLoading(true);
    setLoadError('');
    const res = await listGalleryMediaPage({ page: p, search: q, perPage: 25 });
    setUploaded(res.items);
    setPage(res.page);
    setLastPage(res.lastPage);
    setTotal(res.total);
    setLoadError(res.error ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadPage(1, debouncedSearch);
  }, [open, debouncedSearch, loadPage]);

  if (!open || !mounted) return null;

  const normalizedValue = value ? resolveMediaUrl(value) : '';

  function handleSelect(url: string, label: string, meta?: MediaPickMeta) {
    onSelect(url, label || alt || title, meta);
    onClose();
  }

  function onSearchChange(q: string) {
    setSearch(q);
    setPage(1);
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center admin-overlay p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-surface shadow-premium"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <p className="text-small font-semibold text-primary-dark">{title}</p>
            <p className="text-caption text-text-muted">آپلود کنید یا روی تصویر کلیک کنید تا انتخاب شود</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MediaLibraryGrid
            uploaded={uploaded}
            mode="pick"
            selectedUrl={normalizedValue}
            onSelect={handleSelect}
            onUploaded={() => void loadPage(1, debouncedSearch)}
            paginated={{
              page,
              lastPage,
              total,
              search,
              loading,
              error: loadError,
              onSearchChange,
              onPageChange: (p) => void loadPage(p, debouncedSearch),
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
