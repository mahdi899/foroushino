'use client';

import { useEffect, useState } from 'react';
import { Loader2, RotateCcw, Trash2, X } from 'lucide-react';
import { getGalleryTrashCount, listGalleryTrash, restoreGalleryMedia } from './actions';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import type { AdminMediaTrashItem } from '@/lib/admin/mediaTypes';

function formatRemaining(purgeAt: string): string {
  if (!purgeAt) return '';
  const ms = new Date(purgeAt).getTime() - Date.now();
  if (ms <= 0) return 'در حال حذف…';
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h} ساعت و ${m} دقیقه مانده`;
  return `${m} دقیقه مانده`;
}

interface MediaTrashModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

export function MediaTrashModal({ open, onClose, onChanged }: MediaTrashModalProps) {
  const [items, setItems] = useState<AdminMediaTrashItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    setItems(await listGalleryTrash());
    setLoading(false);
  }

  useEffect(() => {
    if (open) void load();
  }, [open]);

  async function onRestore(id: number) {
    setBusyId(id);
    setError('');
    const res = await restoreGalleryMedia(id);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onChanged();
    await load();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center admin-overlay p-4" onClick={onClose} role="presentation">
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-surface shadow-premium"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-trash-title"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-text-muted" />
            <p id="media-trash-title" className="text-small font-semibold text-primary-dark">
              سطل زباله (۲۴ ساعت)
            </p>
          </div>
          <button type="button" onClick={onClose} className="admin-icon-btn" aria-label="بستن">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <p className="mb-4 text-caption text-text-muted">
            تصاویر حذف‌شده تا ۲۴ ساعت اینجا می‌مانند و قابل بازیابی هستند؛ بعد از آن برای همیشه پاک می‌شوند.
          </p>

          {error && <p className="mb-3 text-small text-error">{error}</p>}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-12 text-center text-small text-text-muted">سطل زباله خالی است.</p>
          ) : (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-soft/50 p-2"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-surface">
                    <DirectMediaImg admin src={item.url} alt={item.label} fill className="object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium text-text">{item.label}</p>
                    <p className="text-caption text-text-muted">{formatRemaining(item.purge_at)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRestore(item.id)}
                    disabled={busyId === item.id}
                    className="btn btn-secondary shrink-0 py-1.5 text-caption"
                  >
                    {busyId === item.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    بازیابی
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/** Hook for trash badge count in the gallery toolbar. */
export function useMediaTrashCount(refreshSignal = 0) {
  const [count, setCount] = useState(0);

  const refresh = () => {
    void getGalleryTrashCount().then(setCount);
  };

  useEffect(() => {
    refresh();
  }, [refreshSignal]);

  return { count, refresh };
}
