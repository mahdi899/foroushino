'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import type { ApiCategory } from '@/lib/api/types';
import { createBlogCategory, deleteBlogCategory, getBlogCategories, updateBlogCategory } from './actions';

interface BlogCategoriesManagerProps {
  onCategoriesChange?: (categories: ApiCategory[]) => void;
  compact?: boolean;
}

export function BlogCategoriesManager({ onCategoriesChange, compact }: BlogCategoriesManagerProps) {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newSlug, setNewSlug] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [busyId, setBusyId] = useState<number | 'add' | null>(null);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await getBlogCategories();
    setCategories(list);
    onCategoriesChange?.(list);
    setLoading(false);
  }, [onCategoriesChange]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusyId('add');
    const res = await createBlogCategory({ name: newName, slug: newSlug || undefined });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNewName('');
    setNewSlug('');
    await refresh();
  }

  function startEdit(category: ApiCategory) {
    setEditingId(category.id);
    setEditName(category.name);
    setEditSlug(category.slug);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName('');
    setEditSlug('');
  }

  async function handleSaveEdit(categoryId: number) {
    setError('');
    setBusyId(categoryId);
    const res = await updateBlogCategory(categoryId, {
      name: editName,
      slug: editSlug,
    });
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    cancelEdit();
    await refresh();
  }

  async function handleDelete(category: ApiCategory) {
    if (!window.confirm(`دسته «${category.name}» حذف شود؟ مقالات این دسته بدون دسته می‌شوند.`)) return;
    setError('');
    setBusyId(category.id);
    const res = await deleteBlogCategory(category.id);
    setBusyId(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    if (editingId === category.id) cancelEdit();
    await refresh();
  }

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <form onSubmit={handleAdd} className="space-y-3 rounded-lg border border-border bg-surface-soft/60 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="field-label">نام دسته</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="field-input"
              placeholder="مثلاً فروش و بازاریابی"
            />
          </div>
          <div>
            <label className="field-label">اسلاگ (لینک URL)</label>
            <input
              value={newSlug}
              onChange={(e) => setNewSlug(e.target.value)}
              className="field-input"
              dir="ltr"
              placeholder="sales-marketing"
            />
          </div>
        </div>
        <p className="text-caption text-text-muted">
          در URL insights: <span dir="ltr" className="font-mono">/insights/اسلاگ</span>
          {' '}— اگر اسلاگ خالی باشد از نام ساخته می‌شود.
        </p>
        <button
          type="submit"
          disabled={busyId === 'add' || !newName.trim()}
          className="btn btn-primary px-4 py-2 text-small"
        >
          {busyId === 'add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          افزودن دسته
        </button>
      </form>

      {error && <p className="text-caption text-error">{error}</p>}

      {loading ? (
        <div className="flex items-center gap-2 py-4 text-caption text-text-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : categories.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border bg-surface-soft px-4 py-6 text-center text-caption text-text-muted">
          هنوز دسته‌بندی برای مجله تعریف نشده.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
          {categories.map((category) => (
            <li key={category.id} className="px-3 py-2.5">
              {editingId === category.id ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="field-label">نام</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="field-input"
                      />
                    </div>
                    <div>
                      <label className="field-label">اسلاگ</label>
                      <input
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        className="field-input"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveEdit(category.id)}
                      disabled={busyId === category.id || !editName.trim() || !editSlug.trim()}
                      className="btn btn-primary px-3 py-1.5 text-caption"
                    >
                      {busyId === category.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      ذخیره
                    </button>
                    <button type="button" onClick={cancelEdit} className="btn btn-secondary px-3 py-1.5 text-caption">
                      <X className="h-3.5 w-3.5" />
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-small font-medium text-text">{category.name}</p>
                    <p className="truncate font-mono text-caption text-text-muted" dir="ltr">
                      /blog/{category.slug}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => startEdit(category)}
                      className="btn btn-ghost px-2 py-1.5 text-text-muted hover:text-primary"
                      title="ویرایش"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      disabled={busyId === category.id}
                      className="btn btn-ghost px-2 py-1.5 text-error hover:bg-error/10"
                      title="حذف دسته"
                    >
                      {busyId === category.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
