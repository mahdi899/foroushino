'use client';

import { useCallback, useEffect, useState } from 'react';
import { listGalleryMediaPage } from './actions';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';
import { MediaEditModal } from './MediaEditModal';
import { StaticMediaModal } from './StaticMediaModal';
import { MediaLibraryGrid } from '../content/MediaLibraryGrid';
import type { UnifiedMediaItem } from '@/lib/admin/unifiedGallery';

export default function AdminGalleryPage() {
  const [uploaded, setUploaded] = useState<AdminMediaItem[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string>('همه');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editItem, setEditItem] = useState<AdminMediaItem | null>(null);
  const [staticItem, setStaticItem] = useState<UnifiedMediaItem | null>(null);
  const [trashRefresh, setTrashRefresh] = useState(0);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const loadPage = useCallback(async (p: number, q: string, cat: string) => {
    setLoading(true);
    setLoadError('');
    const res = await listGalleryMediaPage({ page: p, search: q, category: cat, perPage: 25 });
    setUploaded(res.items);
    setPage(res.page);
    setLastPage(res.lastPage);
    setTotal(res.total);
    setLoadError(res.error ?? '');
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadPage(1, debouncedSearch, category);
  }, [debouncedSearch, category, loadPage]);

  function goToPage(p: number) {
    void loadPage(p, debouncedSearch, category);
  }

  async function reload() {
    await loadPage(page, debouncedSearch, category);
  }

  function onManage(item: UnifiedMediaItem) {
    if (item.kind === 'static') {
      setStaticItem(item);
      return;
    }
    if (item.adminItem) setEditItem(item.adminItem);
  }

  function onSearchChange(q: string) {
    setSearch(q);
    setPage(1);
  }

  function onCategoryChange(cat: string) {
    setCategory(cat);
    setPage(1);
  }

  return (
    <div>
      <div className="mb-6 border-b border-border pb-5">
        <h1 className="text-h2 font-extrabold text-primary-dark">کتابخانه رسانه</h1>
        <p className="mt-1.5 text-small text-text-muted">
          مرکز مدیریت تصاویر سایت — آپلود، بهینه‌سازی خودکار (TinyPNG / reSmush)، ویرایش عنوان و alt، و استفاده در
          مقالات و صفحات.
        </p>
      </div>

      <div className="card overflow-hidden">
        <MediaLibraryGrid
          uploaded={uploaded}
          mode="manage"
          onManage={onManage}
          onUploaded={() => void loadPage(1, debouncedSearch, category)}
          trashRefreshSignal={trashRefresh}
          paginated={{
            page,
            lastPage,
            total,
            search,
            category,
            loading,
            error: loadError,
            onSearchChange,
            onCategoryChange: (cat) => onCategoryChange(cat),
            onPageChange: goToPage,
          }}
        />
      </div>

      <MediaEditModal
        item={editItem}
        onClose={() => setEditItem(null)}
        onSaved={(updated) => {
          void reload();
          if (updated) setEditItem(updated);
        }}
        onTrashed={() => setTrashRefresh((n) => n + 1)}
      />
      <StaticMediaModal item={staticItem} onClose={() => setStaticItem(null)} />
    </div>
  );
}
