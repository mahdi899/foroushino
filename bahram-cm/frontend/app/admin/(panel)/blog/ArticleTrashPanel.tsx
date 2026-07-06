'use client';

import { useState } from 'react';
import { Loader2, RotateCcw, Trash2 } from 'lucide-react';
import { getTrashedArticles, restoreArticle } from '@/lib/admin/articleActions';
import type { ApiArticle } from '@/lib/api/types';

function formatTimeLeft(purgeAt: string): string {
  const ms = new Date(purgeAt).getTime() - Date.now();
  if (ms <= 0) return 'به‌زودی حذف دائمی';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) return `${hours} ساعت و ${minutes} دقیقه مانده`;
  return `${minutes} دقیقه مانده`;
}

export function ArticleTrashPanel({ initialItems = [] }: { initialItems?: ApiArticle[] }) {
  const [items, setItems] = useState<ApiArticle[]>(initialItems);
  const [restoringId, setRestoringId] = useState<number | null>(null);

  async function reload() {
    const data = await getTrashedArticles();
    setItems(data);
  }

  async function onRestore(id: number) {
    setRestoringId(id);
    const res = await restoreArticle(id);
    if (res.ok) await reload();
    setRestoringId(null);
  }

  if (!items.length) return null;

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-surface-soft/60 px-4 py-3">
        <Trash2 className="h-4 w-4 text-text-muted" />
        <div>
          <p className="text-small font-semibold text-primary-dark">سطل بازیابی</p>
          <p className="text-caption text-text-muted">مقالات حذف‌شده تا ۲۴ ساعت قابل بازیابی هستند</p>
        </div>
      </div>
      <ul className="divide-y divide-border">
        {items.map((a) => (
          <li key={a.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium text-text">{a.title}</p>
              <p className="mt-1 text-caption text-text-muted">
                {a.purge_at ? formatTimeLeft(a.purge_at) : '۲۴ ساعت مهلت بازیابی'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRestore(a.id)}
              disabled={restoringId === a.id}
              className="btn btn-secondary shrink-0 px-3 py-2 text-small"
            >
              {restoringId === a.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4" />
              )}
              بازیابی
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
