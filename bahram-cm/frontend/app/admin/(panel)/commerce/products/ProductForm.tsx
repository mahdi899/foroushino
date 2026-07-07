'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Maximize2, Save, Trash2 } from 'lucide-react';
import { AdminPage } from '../../ui';
import { useAdminFocus } from '../../AdminFocusContext';
import { CoverImageField } from '../../content/CoverImageField';
import { ArticleBodyEditor } from '../../blog/ArticleBodyEditorLazy';
import { SeoScorePanel } from '../../blog/SeoScorePanel';
import { saveProduct, deleteProduct } from '../actions';
import type { AdminProduct } from '@/lib/admin/commerceTypes';
import type { SeoFixPatch } from '@/lib/ai/seoFix';

const empty: Partial<AdminProduct> = {
  title: '',
  slug: '',
  type: 'normal',
  description: '',
  short_description: '',
  price: 0,
  sale_price: null,
  is_active: true,
  featured_image: '',
  spotplayer_course_id: '',
  spotplayer_product_id: '',
  meta_title: '',
  meta_description: '',
};

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const { focusMode, toggleFocusMode } = useAdminFocus();
  const [form, setForm] = useState({ ...empty, ...product });
  const [focusKeyword, setFocusKeyword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function patch(partial: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const aiImagePrompt = form.title || form.short_description || focusKeyword;

  const applySeoFix = useCallback((patch: SeoFixPatch) => {
    if (patch.focusKeyword) setFocusKeyword(patch.focusKeyword);
    setForm((prev) => ({
      ...prev,
      title: patch.title ?? prev.title,
      slug: patch.slug ?? prev.slug,
      short_description: patch.excerpt ?? prev.short_description,
      description: patch.body ?? prev.description,
      meta_title: patch.metaTitle ?? prev.meta_title,
      meta_description: patch.metaDescription ?? prev.meta_description,
    }));
  }, []);

  const seoScorePanelProps = useMemo(
    () => ({
      title: form.title ?? '',
      excerpt: form.short_description ?? '',
      body: form.description ?? '',
      slug: form.slug ?? '',
      focusKeyword,
      metaTitle: form.meta_title ?? form.title ?? '',
      metaDescription: form.meta_description ?? form.short_description ?? '',
      coverUrl: form.featured_image ?? '',
      robots: 'noindex,follow',
      onApplyFix: applySeoFix,
    }),
    [form, focusKeyword, applySeoFix],
  );

  async function onSave() {
    if (!form.title?.trim()) {
      setError('عنوان محصول الزامی است.');
      return;
    }

    setPending(true);
    setError('');
    setMessage('');

    const res = await saveProduct(
      {
        title: form.title ?? '',
        slug: form.slug ?? '',
        type: (form.type as 'package' | 'normal') ?? 'normal',
        description: form.description,
        short_description: form.short_description,
        price: Number(form.price) || 0,
        sale_price: form.sale_price ? Number(form.sale_price) : null,
        is_active: !!form.is_active,
        featured_image: form.featured_image || null,
        spotplayer_course_id: form.spotplayer_course_id || null,
        spotplayer_product_id: form.spotplayer_product_id || null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      },
      product?.id,
    );

    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }

    setMessage('ذخیره شد.');
    if (!product?.id && res.id) {
      router.push(`/admin/commerce/products/${res.id}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!product?.id || !confirm('این محصول حذف شود؟')) return;
    setPending(true);
    const res = await deleteProduct(product.id);
    setPending(false);
    if (res.ok) {
      router.push('/admin/commerce/products');
      router.refresh();
    } else {
      setError(res.error ?? 'حذف ناموفق');
    }
  }

  return (
    <AdminPage
      title={product ? `ویرایش: ${product.title}` : 'محصول جدید'}
      desc={product ? 'ویرایش اطلاعات محصول با ویرایشگر پیشرفته' : 'ایجاد دوره یا پکیج فروش'}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={toggleFocusMode}
            className="btn btn-secondary px-3 py-2 text-small"
            title="حالت فوکوس"
          >
            <Maximize2 className="h-4 w-4" />
            {focusMode ? 'خروج فوکوس' : 'فوکوس'}
          </button>
          {product?.id && form.slug && (
            <Link
              href={`/purchase/${form.slug}`}
              target="_blank"
              className="btn btn-secondary px-3 py-2 text-small"
            >
              <ExternalLink className="h-4 w-4" />
              پیش‌نمایش
            </Link>
          )}
          {product?.id && (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={pending}
              className="btn btn-secondary px-3 py-2 text-small text-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={pending || !form.title?.trim()}
            className="btn btn-primary px-4 py-2 text-small"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      }
    >
      <div className={focusMode ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[1fr_280px] lg:items-start'}>
        <div className="space-y-6">
          <div className="card space-y-4 p-5">
            <h2 className="text-h3 font-bold text-primary-dark">اطلاعات محصول</h2>

            <div>
              <label className="field-label">عنوان محصول *</label>
              <input
                className="field-input"
                value={form.title ?? ''}
                onChange={(e) =>
                  patch({
                    title: e.target.value,
                    meta_title: form.meta_title ? form.meta_title : e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">آدرس (slug)</label>
                <input
                  className="field-input"
                  dir="ltr"
                  value={form.slug ?? ''}
                  onChange={(e) => patch({ slug: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">نوع</label>
                <select
                  className="field-input"
                  value={form.type ?? 'normal'}
                  onChange={(e) => patch({ type: e.target.value as 'package' | 'normal' })}
                >
                  <option value="normal">عادی</option>
                  <option value="package">پکیج</option>
                </select>
              </div>
            </div>

            <label className="flex items-center gap-2 text-small text-text">
              <input
                type="checkbox"
                checked={!!form.is_active}
                onChange={(e) => patch({ is_active: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              فعال
            </label>

            <div>
              <label className="field-label">توضیح کوتاه</label>
              <textarea
                className="field-input min-h-[4rem]"
                value={form.short_description ?? ''}
                onChange={(e) => patch({ short_description: e.target.value })}
              />
            </div>

            <CoverImageField
              label="تصویر شاخص"
              value={form.featured_image ?? ''}
              onChange={(featured_image) => patch({ featured_image })}
              alt={form.title || 'تصویر محصول'}
              aiPrompt={aiImagePrompt}
            />

            <ArticleBodyEditor
              label="توضیحات کامل"
              value={form.description ?? ''}
              onChange={(description) => patch({ description })}
              placeholder="توضیحات کامل محصول را بنویسید…"
              aiPrompt={aiImagePrompt}
            />
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-h3 font-bold text-primary-dark">قیمت‌گذاری</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">قیمت (تومان) *</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  value={form.price ?? 0}
                  onChange={(e) => patch({ price: Number(e.target.value) })}
                  required
                />
              </label>
              <label>
                <span className="field-label">قیمت با تخفیف</span>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  value={form.sale_price ?? ''}
                  onChange={(e) => patch({ sale_price: e.target.value ? Number(e.target.value) : null })}
                />
              </label>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="mb-4 text-h3 font-bold text-primary-dark">SpotPlayer</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                <span className="field-label">شناسه دوره</span>
                <input
                  className="field-input"
                  value={form.spotplayer_course_id ?? ''}
                  onChange={(e) => patch({ spotplayer_course_id: e.target.value })}
                />
              </label>
              <label>
                <span className="field-label">شناسه محصول</span>
                <input
                  className="field-input"
                  value={form.spotplayer_product_id ?? ''}
                  onChange={(e) => patch({ spotplayer_product_id: e.target.value })}
                />
              </label>
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <div className="border-b border-border pb-3">
              <h2 className="text-h3 font-bold text-primary-dark">تنظیمات SEO</h2>
            </div>
            <div>
              <label className="field-label">کلمه کلیدی اصلی (Focus Keyword)</label>
              <input
                className="field-input"
                value={focusKeyword}
                onChange={(e) => setFocusKeyword(e.target.value)}
                placeholder="مثلاً: دوره کمپین‌نویسی"
              />
            </div>
            <div className="grid gap-4">
              <div>
                <label className="field-label">Meta Title</label>
                <input
                  className="field-input"
                  value={form.meta_title ?? ''}
                  onChange={(e) => patch({ meta_title: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Meta Description</label>
                <textarea
                  className="field-input min-h-[4rem]"
                  value={form.meta_description ?? ''}
                  onChange={(e) => patch({ meta_description: e.target.value })}
                />
              </div>
            </div>

            {focusMode && <SeoScorePanel {...seoScorePanelProps} variant="inline" />}
          </div>

          {error && <p className="text-small text-error">{error}</p>}
          {message && <p className="text-small text-success">{message}</p>}

          <div className="flex flex-wrap gap-3">
            <Link href="/admin/commerce/products" className="btn btn-secondary">
              بازگشت
            </Link>
          </div>
        </div>

        {!focusMode && <SeoScorePanel {...seoScorePanelProps} variant="sidebar" />}
      </div>
    </AdminPage>
  );
}
