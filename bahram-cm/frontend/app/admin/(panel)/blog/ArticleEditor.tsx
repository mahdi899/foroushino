'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Maximize2, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { AdminPage } from '../ui';
import { useAdminFocus } from '../AdminFocusContext';
import { CoverImageField } from '../content/CoverImageField';
import { getAdminArticleById, saveArticle, deleteArticle } from '../content/actions';
import type { ArticlePayload } from '@/lib/admin/articleTypes';
import { getBlogCategories } from './actions';
import type { ApiCategory } from '@/lib/api/types';
import type { AiArticleResult } from '@/lib/admin/blogAiTypes';
import { ArticleBodyEditor } from './ArticleBodyEditorLazy';
import { AiArticleAssistant } from './AiArticleAssistant';
import { SeoScorePanel } from './SeoScorePanel';
import { DeleteArticleModal } from './DeleteArticleModal';
import { ArticleRevisionsMenu } from './ArticleRevisionsMenu';
import { BlogCategoriesModal } from './BlogCategoriesModal';
import { useArticleAutosave } from './useArticleAutosave';
import { buildArticleRevisionSnapshot, hashRevisionSnapshot, snapshotToDraft, type ArticleRevisionSnapshot } from '@/lib/admin/articleRevisions';
import type { SeoFixPatch } from '@/lib/ai/seoFix';

const ARTICLE_STATUS_LABELS: Record<string, string> = {
  active: 'فعال',
  draft: 'پیش‌نویس',
};

export const EMPTY_ARTICLE: ArticlePayload & { focusKeyword: string } = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  cover_url: '',
  cover_url_mobile: '',
  reading_time: '۵ دقیقه',
  status: 'draft',
  focusKeyword: '',
  category_id: null,
  seo: { title: '', description: '', robots: 'index,follow' },
};

interface ArticleEditorProps {
  articleId: number | null;
}

export function ArticleEditor({ articleId }: ArticleEditorProps) {
  const router = useRouter();
  const { focusMode, toggleFocusMode } = useAdminFocus();
  const [loading, setLoading] = useState(Boolean(articleId));
  const [selectedId, setSelectedId] = useState<number | null>(articleId);
  const [draft, setDraft] = useState(EMPTY_ARTICLE);
  const [focusKeyword, setFocusKeyword] = useState('');
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [saving, setSaving] = useState(false);
  const [indexNotifyMessage, setIndexNotifyMessage] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [revisionRefreshKey, setRevisionRefreshKey] = useState(0);
  const [categoriesModalOpen, setCategoriesModalOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isDraft = draft.status === 'draft';

  const getRevisionSnapshot = useCallback(
    () =>
      buildArticleRevisionSnapshot({
        title: draft.title,
        slug: draft.slug ?? '',
        excerpt: draft.excerpt ?? '',
        body: draft.body ?? '',
        cover_url: draft.cover_url ?? '',
        cover_url_mobile: draft.cover_url_mobile ?? '',
        reading_time: draft.reading_time ?? '۵ دقیقه',
        status: draft.status ?? 'draft',
        category_id: draft.category_id ?? null,
        focusKeyword,
        seo: draft.seo,
      }),
    [draft, focusKeyword],
  );

  const revisionContentKey = hashRevisionSnapshot(getRevisionSnapshot());

  const { lastSavedAt, saving: autosaveSaving } = useArticleAutosave({
    articleId: selectedId,
    enabled: isDraft,
    contentKey: revisionContentKey,
    getSnapshot: getRevisionSnapshot,
    onSaved: () => setRevisionRefreshKey((k) => k + 1),
  });

  useEffect(() => {
    if (!articleId) {
      void getBlogCategories().then(setCategories);
      setLoading(false);
      return;
    }
    void Promise.all([getBlogCategories(), getAdminArticleById(articleId)])
      .then(([categories, a]) => {
        setCategories(categories);
        if (!a) {
          setLoadError('مقاله پیدا نشد یا دسترسی ندارید.');
          return;
        }
        setLoadError(null);
        setSelectedId(a.id);
        setDraft({
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt ?? '',
          body: a.body ?? '',
          cover_url: a.cover_url ?? '',
          cover_url_mobile: a.cover_url_mobile ?? '',
          reading_time: a.reading_time ?? '۵ دقیقه',
          status: a.status,
          published_at: a.published_at,
          seo: {
            title: a.seo?.title ?? a.title,
            description: a.seo?.description ?? a.excerpt ?? '',
            canonical: a.seo?.canonical ?? '',
            robots: a.seo?.robots ?? 'index,follow',
          },
          focusKeyword: '',
          category_id: a.category?.id ?? null,
        });
      })
      .catch(() => setLoadError('بارگذاری مقاله ناموفق بود. صفحه را رفرش کنید.'))
      .finally(() => setLoading(false));
  }, [articleId]);

  function applyAiResult(result: AiArticleResult) {
    setFocusKeyword(result.focusKeyword);
    setDraft((prev) => ({
      ...prev,
      title: result.title,
      slug: result.slug,
      excerpt: result.excerpt,
      body: result.body,
      cover_url: result.cover_url ?? prev.cover_url,
      reading_time: result.reading_time,
      category_id: result.category_id ?? prev.category_id,
      seo: {
        ...prev.seo,
        title: result.seo.title,
        description: result.seo.description,
        robots: prev.seo?.robots ?? 'index,follow',
      },
    }));
  }

  async function onSave() {
    setSaving(true);
    setIndexNotifyMessage(null);
    const payload: ArticlePayload = {
      title: draft.title,
      slug: draft.slug || undefined,
      excerpt: draft.excerpt,
      body: draft.body,
      cover_url: draft.cover_url,
      cover_url_mobile: draft.cover_url_mobile,
      reading_time: draft.reading_time,
      status: draft.status,
      category_id: draft.category_id ?? null,
      published_at: draft.status === 'active' ? new Date().toISOString() : null,
      seo: draft.seo,
    };
    const res = await saveArticle(selectedId, payload);
    if (res.ok) {
      if (res.id && !selectedId) {
        router.replace(`/admin/blog/${res.id}`);
        setSelectedId(res.id);
      }
      if (res.crawlNotify?.ok && draft.status === 'active') {
        setIndexNotifyMessage(res.crawlNotify.message);
      }
      if (payload.status === 'active') {
        setRevisionRefreshKey((k) => k + 1);
      }
    }
    setSaving(false);
  }

  const applySeoFix = useCallback((patch: SeoFixPatch) => {
    if (patch.focusKeyword) setFocusKeyword(patch.focusKeyword);
    setDraft((prev) => ({
      ...prev,
      title: patch.title ?? prev.title,
      slug: patch.slug ?? prev.slug,
      excerpt: patch.excerpt ?? prev.excerpt,
      body: patch.body ?? prev.body,
      category_id: patch.categoryId !== undefined ? patch.categoryId : prev.category_id,
      seo: {
        ...prev.seo,
        title: patch.metaTitle ?? prev.seo?.title ?? '',
        description: patch.metaDescription ?? prev.seo?.description ?? '',
        robots: patch.robots ?? prev.seo?.robots ?? 'index,follow',
        canonical: prev.seo?.canonical ?? '',
      },
    }));
  }, []);

  function restoreRevision(snapshot: ArticleRevisionSnapshot) {
    const restored = snapshotToDraft(snapshot);
    setFocusKeyword(restored.focusKeyword ?? '');
    setDraft((prev) => ({
      ...prev,
      title: restored.title,
      slug: restored.slug,
      excerpt: restored.excerpt,
      body: restored.body,
      cover_url: restored.cover_url,
      cover_url_mobile: restored.cover_url_mobile,
      reading_time: restored.reading_time,
      status: restored.status,
      category_id: restored.category_id,
      seo: restored.seo,
    }));
  }

  async function confirmDelete() {
    if (!selectedId) return;
    setDeleting(true);
    const res = await deleteArticle(selectedId);
    setDeleting(false);
    if (res.ok) {
      setDeleteModalOpen(false);
      router.push('/admin/blog');
    }
  }

  const aiImagePrompt = draft.title || draft.excerpt || focusKeyword;
  const categoryName = categories.find((c) => c.id === draft.category_id)?.name ?? '';

  const seoScorePanelProps = useMemo(
    () => ({
      title: draft.title,
      excerpt: draft.excerpt ?? '',
      body: draft.body ?? '',
      slug: draft.slug ?? '',
      focusKeyword,
      metaTitle: draft.seo?.title ?? draft.title,
      metaDescription: draft.seo?.description ?? draft.excerpt ?? '',
      coverUrl: draft.cover_url ?? '',
      categoryName,
      robots: draft.seo?.robots ?? 'index,follow',
      indexNotifyMessage,
      categories,
      onApplyFix: applySeoFix,
    }),
    [draft, focusKeyword, categoryName, indexNotifyMessage, categories, applySeoFix],
  );

  const handleCategoriesChange = useCallback((next: ApiCategory[]) => {
    setCategories(next);
    setDraft((prev) => {
      if (prev.category_id && !next.some((c) => c.id === prev.category_id)) {
        return { ...prev, category_id: null };
      }
      return prev;
    });
  }, []);

  if (loading) {
    return (
      <AdminPage title={articleId ? 'ویرایش مقاله' : 'افزودن مقاله'} desc="در حال بارگذاری…">
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      compactHeader
      backHref="/admin/blog"
      title={articleId ? 'ویرایش مقاله' : 'افزودن مقاله'}
      desc="تو قهوه‌ات رو بخور؛ هوش پلاستیکی مینویسه"
      action={
        <div className="admin-article-toolbar">
          <button type="button" onClick={toggleFocusMode} className="btn btn-secondary admin-toolbar-btn" title="حالت فوکوس">
            <Maximize2 className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">{focusMode ? 'خروج' : 'فوکوس'}</span>
          </button>
          <ArticleRevisionsMenu
            articleId={selectedId}
            isDraft={isDraft}
            getSnapshot={getRevisionSnapshot}
            lastAutosaveAt={lastSavedAt}
            autosaveSaving={autosaveSaving}
            refreshKey={revisionRefreshKey}
            onRestore={restoreRevision}
            onRevisionSaved={() => setRevisionRefreshKey((k) => k + 1)}
          />
          {selectedId && draft.slug && (
            <Link href={`/insights/${draft.slug}`} target="_blank" className="btn btn-secondary admin-toolbar-btn">
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">نمایش</span>
            </Link>
          )}
          {selectedId && (
            <button
              type="button"
              onClick={() => setDeleteModalOpen(true)}
              disabled={saving || deleting}
              className="btn btn-secondary admin-toolbar-btn text-error"
              title="حذف مقاله"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">حذف</span>
            </button>
          )}
          <select
            value={draft.status}
            onChange={(e) => setDraft({ ...draft, status: e.target.value })}
            className="field-input admin-toolbar-select"
            aria-label="وضعیت مقاله"
          >
            <option value="draft">پیش‌نویس</option>
            <option value="active">منتشر شده</option>
          </select>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !draft.title}
            className="btn btn-primary admin-toolbar-btn whitespace-nowrap"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            ذخیره
          </button>
        </div>
      }
    >
      <div
        className={cn(
          'admin-article-layout grid min-w-0 gap-4',
          focusMode && 'admin-article-layout--focus',
          focusMode ? 'grid-cols-1' : 'lg:grid-cols-[minmax(0,1fr)_minmax(0,280px)] lg:items-start lg:gap-5',
        )}
      >
        {loadError && (
          <div
            className={cn(
              'rounded-lg border border-error/30 bg-error/5 px-4 py-3 text-small text-error',
              !focusMode && 'lg:col-span-2',
            )}
          >
            {loadError}
          </div>
        )}

        {focusMode ? (
          <>
            <div className="card article-editor-focus-card min-w-0 w-full px-4 pb-4 pt-0 sm:px-6 sm:pb-6 sm:pt-0">
              <ArticleBodyEditor
                value={draft.body ?? ''}
                onChange={(body) => setDraft({ ...draft, body })}
                aiPrompt={aiImagePrompt}
              />
            </div>
            <SeoScorePanel {...seoScorePanelProps} variant="inline" />
          </>
        ) : (
          <>
            <div className="card min-w-0 space-y-4 p-4 sm:p-5 lg:col-start-1">
              <AiArticleAssistant onApply={applyAiResult} />
              <div>
                <label className="field-label">عنوان مقاله</label>
                <input
                  className="field-input"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value, seo: { ...draft.seo, title: draft.seo?.title || e.target.value } })
                  }
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">اسلاگ</label>
                  <input className="field-input" dir="ltr" value={draft.slug} onChange={(e) => setDraft({ ...draft, slug: e.target.value })} />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <label className="field-label mb-0">دسته‌بندی</label>
                    <button
                      type="button"
                      onClick={() => setCategoriesModalOpen(true)}
                      className="text-caption font-semibold text-accent hover:underline"
                    >
                      مدیریت دسته‌ها
                    </button>
                  </div>
                  <select
                    className="field-input"
                    value={draft.category_id ?? ''}
                    onChange={(e) =>
                      setDraft({ ...draft, category_id: e.target.value ? Number(e.target.value) : null })
                    }
                  >
                    <option value="">بدون دسته</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="field-label">خلاصه</label>
                <textarea className="field-input min-h-[4rem]" value={draft.excerpt} onChange={(e) => setDraft({ ...draft, excerpt: e.target.value })} />
              </div>
              <CoverImageField
                label="تصویر شاخص — دسکتاپ"
                value={draft.cover_url ?? ''}
                onChange={(cover_url) => setDraft({ ...draft, cover_url })}
                alt={draft.title || 'تصویر شاخص مقاله — دسکتاپ'}
                aiPrompt={aiImagePrompt}
              />
              <CoverImageField
                label="تصویر شاخص — موبایل (۹:۱۶)"
                value={draft.cover_url_mobile ?? ''}
                onChange={(cover_url_mobile) => setDraft({ ...draft, cover_url_mobile })}
                alt={draft.title || 'تصویر شاخص مقاله — موبایل'}
                aiPrompt={aiImagePrompt}
              />
              <p className="text-caption text-text-muted">
                اگر تصویر موبایل خالی باشد، همان تصویر دسکتاپ در هیرو موبایل نمایش داده می‌شود. در لیست
                مقالات فقط تصویر دسکتاپ استفاده می‌شود.
              </p>
              <ArticleBodyEditor
                value={draft.body ?? ''}
                onChange={(body) => setDraft({ ...draft, body })}
                aiPrompt={aiImagePrompt}
              />
              <div className="border-t border-border pt-4">
                <p className="mb-3 text-small font-semibold text-primary-dark">تنظیمات SEO</p>
                <div className="mb-3">
                  <label className="field-label">کلمه کلیدی اصلی (Focus Keyword)</label>
                  <input className="field-input" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} placeholder="مثلاً: آمادگی سات" />
                </div>
                <div className="grid gap-4">
                  <div>
                    <label className="field-label">Meta Title</label>
                    <input className="field-input" value={draft.seo?.title ?? ''} onChange={(e) => setDraft({ ...draft, seo: { ...draft.seo, title: e.target.value } })} />
                  </div>
                  <div>
                    <label className="field-label">Meta Description</label>
                    <textarea className="field-input min-h-[4rem]" value={draft.seo?.description ?? ''} onChange={(e) => setDraft({ ...draft, seo: { ...draft.seo, description: e.target.value } })} />
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 lg:col-start-2 lg:min-w-[280px]">
              <SeoScorePanel {...seoScorePanelProps} variant="sidebar" />
            </div>
          </>
        )}
      </div>

      <DeleteArticleModal
        open={deleteModalOpen}
        title={draft.title}
        loading={deleting}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />

      <BlogCategoriesModal
        open={categoriesModalOpen}
        onClose={() => setCategoriesModalOpen(false)}
        onCategoriesChange={handleCategoriesChange}
      />
    </AdminPage>
  );
}
