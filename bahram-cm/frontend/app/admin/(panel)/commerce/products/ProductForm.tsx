'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, ImageIcon, Loader2, Maximize2, Save, Trash2 } from 'lucide-react';
import { AdminPage } from '../../ui';
import { useAdminFocus } from '../../AdminFocusContext';
import { CoverImageField } from '../../content/CoverImageField';
import { ArticleBodyEditor } from '../../blog/ArticleBodyEditorLazy';
import { SeoScorePanel } from '../../blog/SeoScorePanel';
import { saveProduct, deleteProduct } from '../actions';
import { SpotPlayerProductSection } from './SpotPlayerProductSection';
import type { AdminProduct } from '@/lib/admin/commerceTypes';
import type { SeoFixPatch } from '@/lib/ai/seoFix';
import { resolveProductSiteFeaturedImage } from '@/lib/catalog/productFeaturedImage';

const empty: Partial<AdminProduct> = {
  title: '',
  slug: '',
  type: 'normal',
  description: '',
  short_description: '',
  price: 0,
  sale_price: null,
  referral_cashback_enabled: false,
  referral_cashback_type: 'fixed',
  referral_cashback_value: null,
  is_active: true,
  show_in_telegram: false,
  telegram_list_visibility: 'public',
  telegram_sort_order: 0,
  featured_image: '',
  show_on_courses: false,
  featured_listing: false,
  course_level: '',
  course_duration: '',
  landing_href: '',
  spotplayer_course_id: '',
  meta_title: '',
  meta_description: '',
};

export function ProductForm({ product }: { product?: AdminProduct }) {
  const router = useRouter();
  const { focusMode, toggleFocusMode } = useAdminFocus();
  const [form, setForm] = useState(() => {
    const merged = { ...empty, ...product };
    if (!merged.featured_image?.trim()) {
      merged.featured_image = resolveProductSiteFeaturedImage({
        slug: merged.slug,
        landing_href: merged.landing_href,
      });
    }
    return merged;
  });
  const [focusKeyword, setFocusKeyword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function patch(partial: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  const aiImagePrompt = form.title || form.short_description || focusKeyword;

  const siteFeaturedImage = useMemo(
    () =>
      resolveProductSiteFeaturedImage({
        slug: form.slug,
        landing_href: form.landing_href,
      }),
    [form.slug, form.landing_href],
  );

  const canSyncSiteImage =
    !!siteFeaturedImage &&
    (!form.featured_image?.trim() || form.featured_image.trim() !== siteFeaturedImage);

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

    if (form.referral_cashback_enabled) {
      if (!form.referral_cashback_type) {
        setError('نوع کش‌بک معرفی را انتخاب کنید.');
        return;
      }
      if (!form.referral_cashback_value || Number(form.referral_cashback_value) <= 0) {
        setError('مبلغ یا درصد کش‌بک معرفی را وارد کنید.');
        return;
      }
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
        referral_cashback_enabled: !!form.referral_cashback_enabled,
        referral_cashback_type: form.referral_cashback_enabled
          ? (form.referral_cashback_type as 'percent' | 'fixed') ?? 'fixed'
          : null,
        referral_cashback_value: form.referral_cashback_enabled
          ? Number(form.referral_cashback_value) || null
          : null,
        is_active: !!form.is_active,
        show_in_telegram: !!form.show_in_telegram,
        telegram_list_visibility: (form.telegram_list_visibility as 'public' | 'private') ?? 'public',
        telegram_sort_order: Number(form.telegram_sort_order) || 0,
        featured_image: form.featured_image || null,
        show_on_courses: !!form.show_on_courses,
        featured_listing: !!form.featured_listing,
        course_level: form.course_level?.trim() || null,
        course_duration: form.course_duration?.trim() || null,
        landing_href: form.landing_href?.trim() || null,
        spotplayer_course_id: form.spotplayer_course_id?.trim() || null,
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
      backHref="/admin/commerce/products"
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
              پیش‌نمایش خرید
            </Link>
          )}
          {form.show_on_courses && (form.landing_href || form.slug) && (
            <Link
              href={form.landing_href?.trim() || `/course/${form.slug}`}
              target="_blank"
              className="btn btn-secondary px-3 py-2 text-small"
            >
              <ExternalLink className="h-4 w-4" />
              صفحه دوره‌ها
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

            <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
              <div>
                <h3 className="text-small font-semibold text-primary-dark">نمایش در ربات تلگرام</h3>
                <p className="mt-1 text-caption text-text-muted">
                  محصولات فعال‌شده در دکمه «دوره کمپین نویسی» بات نمایش داده می‌شوند و امکان خرید مستقیم دارند.
                  مرچنت زرین‌پال از{' '}
                  <Link href="/admin/commerce/payment-settings" className="text-primary hover:underline">
                    تنظیمات پرداخت
                  </Link>{' '}
                  کنترل می‌شود.
                </p>
              </div>

              <label className="flex items-center gap-2 text-small text-text">
                <input
                  type="checkbox"
                  checked={!!form.show_in_telegram}
                  onChange={(e) => patch({ show_in_telegram: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                نمایش در تلگرام
              </label>

              {form.show_in_telegram ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="field-label">ترتیب در منوی بات</label>
                    <input
                      type="number"
                      min={0}
                      className="field-input"
                      dir="ltr"
                      value={form.telegram_sort_order ?? 0}
                      onChange={(e) => patch({ telegram_sort_order: Number(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="field-label">سطح نمایش</label>
                    <select
                      className="field-input"
                      value={form.telegram_list_visibility ?? 'public'}
                      onChange={(e) =>
                        patch({ telegram_list_visibility: e.target.value as 'public' | 'private' })
                      }
                    >
                      <option value="public">عمومی</option>
                      <option value="private">خصوصی</option>
                    </select>
                  </div>
                </div>
              ) : null}
            </div>

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
            {canSyncSiteImage ? (
              <button
                type="button"
                onClick={() => patch({ featured_image: siteFeaturedImage })}
                className="inline-flex items-center gap-1.5 text-caption text-primary hover:underline"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                همگام‌سازی با تصویر سایت
              </button>
            ) : null}

            <div className="rounded-lg border border-border bg-surface/40 p-4 space-y-4">
              <div>
                <h3 className="text-small font-semibold text-primary-dark">نمایش در صفحه دوره‌ها</h3>
                <p className="mt-1 text-caption text-text-muted">
                  تصویر شاخص و متن‌های زیر روی کارت دوره در صفحه اصلی و /courses نمایش داده می‌شوند.
                </p>
              </div>

              <label className="flex items-center gap-2 text-small text-text">
                <input
                  type="checkbox"
                  checked={!!form.show_on_courses}
                  onChange={(e) => patch({ show_on_courses: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                نمایش در لیست دوره‌ها
              </label>

              {form.show_on_courses ? (
                <>
                  <label className="flex items-center gap-2 text-small text-text">
                    <input
                      type="checkbox"
                      checked={!!form.featured_listing}
                      onChange={(e) => patch({ featured_listing: e.target.checked })}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    برچسب «پرچم‌دار»
                  </label>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="field-label">سطح / مسیر</label>
                      <input
                        className="field-input"
                        value={form.course_level ?? ''}
                        onChange={(e) => patch({ course_level: e.target.value })}
                        placeholder="مثلاً: مسیر حرفه‌ای"
                      />
                    </div>
                    <div>
                      <label className="field-label">مدت / حجم</label>
                      <input
                        className="field-input"
                        value={form.course_duration ?? ''}
                        onChange={(e) => patch({ course_duration: e.target.value })}
                        placeholder="مثلاً: ۱۰ فصل"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="field-label">لینک صفحه دوره</label>
                    <input
                      className="field-input"
                      dir="ltr"
                      value={form.landing_href ?? ''}
                      onChange={(e) => patch({ landing_href: e.target.value })}
                      placeholder="/course/campaign-writing"
                    />
                  </div>
                </>
              ) : null}
            </div>

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
            <h2 className="mb-1 text-h3 font-bold text-primary-dark">کش‌بک معرفی</h2>
            <p className="mb-4 text-caption text-text-muted">
              مبلغ پاداش برای معرف وقتی این محصول با کد دعوت خریداری شود.
            </p>

            <label className="flex items-center gap-2 text-small text-text">
              <input
                type="checkbox"
                checked={!!form.referral_cashback_enabled}
                onChange={(e) => patch({ referral_cashback_enabled: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              فعال‌سازی کش‌بک برای این محصول
            </label>

            {form.referral_cashback_enabled ? (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label">نوع محاسبه</label>
                  <select
                    className="field-input"
                    value={form.referral_cashback_type ?? 'fixed'}
                    onChange={(e) =>
                      patch({ referral_cashback_type: e.target.value as 'percent' | 'fixed' })
                    }
                  >
                    <option value="fixed">مبلغ ثابت (تومان)</option>
                    <option value="percent">درصد از مبلغ خرید</option>
                  </select>
                </div>
                <div>
                  <label className="field-label">
                    {form.referral_cashback_type === 'percent' ? 'درصد کش‌بک' : 'مبلغ کش‌بک (تومان)'}
                  </label>
                  <input
                    className="field-input"
                    type="number"
                    min={1}
                    max={form.referral_cashback_type === 'percent' ? 100 : undefined}
                    value={form.referral_cashback_value ?? ''}
                    onChange={(e) =>
                      patch({
                        referral_cashback_value: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    placeholder={form.referral_cashback_type === 'percent' ? 'مثلاً ۱۰' : 'مثلاً ۲۰۰۰۰۰۰'}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <SpotPlayerProductSection
            courseIds={form.spotplayer_course_id ?? ''}
            onCourseIdsChange={(value) => patch({ spotplayer_course_id: value })}
          />

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
