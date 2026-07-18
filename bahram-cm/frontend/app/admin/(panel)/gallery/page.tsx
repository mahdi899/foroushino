'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminPage } from '../ui';
import { listGalleryMediaPage } from './actions';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';
import { MediaEditModal } from './MediaEditModal';
import { MediaFtpSettings } from './MediaFtpSettings';
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editItem, setEditItem] = useState<AdminMediaItem | null>(null);
  const [staticItem, setStaticItem] = useState<UnifiedMediaItem | null>(null);
  const [trashRefresh, setTrashRefresh] = useState(0);

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
    void loadPage(1, debouncedSearch);
  }, [debouncedSearch, loadPage]);

  function goToPage(p: number) {
    void loadPage(p, debouncedSearch);
  }

  async function reload() {
    await loadPage(page, debouncedSearch);
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

  return (
    <AdminPage
      icon="Image"
      headerVariant="media"
      title="کتابخانه رسانه"
      desc="مرکز مدیریت تصاویر سایت — آپلود، بهینه‌سازی، ویرایش عنوان و alt، و استفاده در مقالات و صفحات"
    >
      <MediaFtpSettings />

      <MediaLibraryGrid
        uploaded={uploaded}
        mode="manage"
        toolbarPlacement="above-card"
        onManage={onManage}
        onUploaded={() => void loadPage(1, debouncedSearch)}
        trashRefreshSignal={trashRefresh}
        paginated={{
          page,
          lastPage,
          total,
          search,
          loading,
          error: loadError,
          onSearchChange,
          onPageChange: goToPage,
        }}
      />

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
    </AdminPage>
  );
}
