'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Maximize2, Save, Trash2 } from 'lucide-react';
import { deleteStudentTestimonial, saveStudentTestimonial } from '../actions';
import type { AdminStudentTestimonial } from '@/lib/admin/commerceTypes';
import type { SeoFixPatch } from '@/lib/ai/seoFix';
import { AdminPage } from '../../ui';
import { useAdminFocus } from '../../AdminFocusContext';
import { CoverImageField } from '../../content/CoverImageField';
import { ArticleBodyEditor } from '../../blog/ArticleBodyEditor';
import { SeoScorePanel } from '../../blog/SeoScorePanel';

export function TestimonialForm({ testimonial }: { testimonial?: AdminStudentTestimonial }) {
  const router = useRouter();
  const { focusMode, toggleFocusMode } = useAdminFocus();
  const [form, setForm] = useState({
    slug: testimonial?.slug ?? '',
    name: testimonial?.name ?? '',
    role: testimonial?.role ?? 'دانشجو',
    before_text: testimonial?.before_text ?? '',
    after_text: testimonial?.after_text ?? '',
    summary: testimonial?.summary ?? '',
    metric_label: testimonial?.metric_label ?? '',
    metric_value: testimonial?.metric_value ?? '',
    body: testimonial?.body ?? '',
    portrait_image: testimonial?.portrait_image ?? '',
    meta_title: testimonial?.meta_title ?? '',
    meta_description: testimonial?.meta_description ?? '',
    sort_order: testimonial?.sort_order ?? 0,
    is_active: testimonial?.is_active ?? true,
  });
  const [focusKeyword, setFocusKeyword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const applySeoFix = useCallback((fix: SeoFixPatch) => {
    if (fix.focusKeyword) setFocusKeyword(fix.focusKeyword);
    setForm((prev) => ({
      ...prev,
      name: fix.title ?? prev.name,
      slug: fix.slug ?? prev.slug,
      summary: fix.excerpt ?? prev.summary,
      body: fix.body ?? prev.body,
      meta_title: fix.metaTitle ?? prev.meta_title,
      meta_description: fix.metaDescription ?? prev.meta_description,
    }));
  }, []);

  const seoScorePanelProps = useMemo(
    () => ({
      title: form.name,
      excerpt: form.summary,
      body: form.body,
      slug: form.slug,
      focusKeyword,
      metaTitle: form.meta_title || (form.name ? `داستان ${form.name}` : ''),
      metaDescription: form.meta_description || form.summary,
      coverUrl: form.portrait_image,
      publicBasePath: '/transformations',
      onApplyFix: applySeoFix,
    }),
    [form, focusKeyword, applySeoFix],
  );

  async function onSave() {
    if (!form.name.trim() || !form.slug.trim()) {
      setError('نام و اسلاگ الزامی است.');
      return;
    }

    setPending(true);
    setError('');
    setMessage('');

    const res = await saveStudentTestimonial(
      {
        slug: form.slug.trim(),
        name: form.name.trim(),
        role: form.role.trim() || 'دانشجو',
        before_text: form.before_text.trim(),
        after_text: form.after_text.trim(),
        summary: form.summary.trim(),
        metric_label: form.metric_label.trim() || null,
        metric_value: form.metric_value.trim() || null,
        body: form.body,
        portrait_image: form.portrait_image.trim() || null,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
      },
      testimonial?.id,
    );

    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }

    setMessage('ذخیره شد.');
    if (!testimonial?.id && res.id) {
      router.push(`/admin/commerce/testimonials/${res.id}`);
      router.refresh();
    } else {
      router.refresh();
    }
  }

  async function onDelete() {
    if (!testimonial?.id || !confirm('حذف شود؟')) return;
    setPending(true);
    const res = await deleteStudentTestimonial(testimonial.id);
    setPending(false);
    if (res.ok) {
      router.push('/admin/commerce/testimonials');
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  const previewSlug = form.slug.trim();
  const defaultMetaTitle = form.name ? `داستان ${form.name}` : '';

  return (
    <AdminPage
      title={testimonial ? `ویرایش: ${testimonial.name}` : 'نظر جدید'}
      desc={testimonial ? 'ویرایش داستان دانشجو' : 'افزودن داستان برای صفحه transformations'}
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
          {previewSlug && form.is_active && (
            <Link
              href={`/transformations/${previewSlug}`}
              target="_blank"
              className="btn btn-secondary px-3 py-2 text-small"
            >
              <ExternalLink className="h-4 w-4" />
              پیش‌نمایش
            </Link>
          )}
          {testimonial?.id && (
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
            disabled={pending || !form.name.trim()}
            className="btn btn-primary px-4 py-2 text-small"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      }
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className={focusMode ? 'grid gap-6' : 'grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start'}>
          <div className="mx-auto w-full max-w-3xl space-y-6 lg:mx-0">
            <div className="card space-y-4 p-6">
              <h2 className="text-center text-h3 font-bold text-primary-dark md:text-start">اطلاعات اصلی</h2>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="field-label">نام دانشجو *</span>
                  <input
                    className="field-input"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name,
                        meta_title:
                          !prev.meta_title.trim() && name ? `داستان ${name}` : prev.meta_title,
                      }));
                    }}
                    required
                  />
                </label>
                <label>
                  <span className="field-label">نقش / تخصص</span>
                  <input
                    className="field-input"
                    value={form.role}
                    onChange={(e) => patch('role', e.target.value)}
                    placeholder="مثلاً طراح برند"
                  />
                </label>
              </div>

              <label>
                <span className="field-label">اسلاگ (لاتین) *</span>
                <input
                  className="field-input font-mono text-small"
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => patch('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="shabnam-a"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
                <p className="mt-1 text-center text-caption text-muted md:text-start">
                  آدرس صفحه: /transformations/{previewSlug || '…'}
                </p>
              </label>

              <CoverImageField
                label="تصویر پرتره"
                value={form.portrait_image}
                onChange={(portrait_image) => patch('portrait_image', portrait_image)}
                alt={form.name || 'پرتره دانشجو'}
                aiPrompt={form.name ? `پرتره حرفه‌ای ${form.name}، نور نرم، پس‌زمینه تیره` : undefined}
              />
            </div>

            <div className="card space-y-4 p-6">
              <h2 className="text-center text-h3 font-bold text-primary-dark md:text-start">قبل و بعد</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="field-label">قبل *</span>
                  <input
                    className="field-input"
                    value={form.before_text}
                    onChange={(e) => patch('before_text', e.target.value)}
                    placeholder="مثلاً معرفی دهان‌به‌دهان"
                    required
                  />
                </label>
                <label>
                  <span className="field-label">بعد *</span>
                  <input
                    className="field-input"
                    value={form.after_text}
                    onChange={(e) => patch('after_text', e.target.value)}
                    placeholder="مثلاً جریان ثابت سرنخ"
                    required
                  />
                </label>
              </div>

              <label>
                <span className="field-label">خلاصه کارت *</span>
                <textarea
                  className="field-input"
                  rows={3}
                  value={form.summary}
                  onChange={(e) => patch('summary', e.target.value)}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="field-label">برچسب متریک (اختیاری)</span>
                  <input
                    className="field-input"
                    value={form.metric_label}
                    onChange={(e) => patch('metric_label', e.target.value)}
                    placeholder="سرنخ ماهانه"
                  />
                </label>
                <label>
                  <span className="field-label">مقدار متریک (اختیاری)</span>
                  <input
                    className="field-input"
                    value={form.metric_value}
                    onChange={(e) => patch('metric_value', e.target.value)}
                    placeholder="از ۲ به ۱۵"
                  />
                </label>
              </div>
            </div>

            <div className="card p-6">
              <ArticleBodyEditor
                label="متن کامل داستان"
                value={form.body}
                onChange={(body) => patch('body', body)}
                placeholder="داستان کامل دانشجو را بنویسید…"
                aiPrompt={form.name ? `داستان تبدیل ${form.name} در مسیر برند شخصی` : undefined}
              />
            </div>

            <div className="card space-y-4 p-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-center text-h3 font-bold text-primary-dark md:text-start">تنظیمات SEO</h2>
              </div>
              <div>
                <label className="field-label">کلمه کلیدی اصلی (Focus Keyword)</label>
                <input
                  className="field-input"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="مثلاً: رضایت دانشجو، برند شخصی"
                />
              </div>
              <div className="grid gap-4">
                <div>
                  <label className="field-label">Meta Title</label>
                  <input
                    className="field-input"
                    value={form.meta_title}
                    onChange={(e) => patch('meta_title', e.target.value)}
                    placeholder={defaultMetaTitle}
                  />
                </div>
                <div>
                  <label className="field-label">Meta Description</label>
                  <textarea
                    className="field-input min-h-[4rem]"
                    value={form.meta_description}
                    onChange={(e) => patch('meta_description', e.target.value)}
                    placeholder={form.summary || 'خلاصه داستان برای نتایج جستجو…'}
                  />
                </div>
              </div>

              {focusMode && <SeoScorePanel {...seoScorePanelProps} variant="inline" />}
            </div>

            <div className="card space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="field-label">ترتیب نمایش</span>
                  <input
                    className="field-input"
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => patch('sort_order', Number(e.target.value))}
                  />
                </label>
                <label className="flex items-end justify-center gap-2 pb-2 md:justify-start">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => patch('is_active', e.target.checked)}
                  />
                  <span className="text-small">فعال — نمایش در /transformations</span>
                </label>
              </div>

              {error && <p className="text-center text-small text-error md:text-start">{error}</p>}
              {message && <p className="text-center text-small text-success md:text-start">{message}</p>}

              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <Link href="/admin/commerce/testimonials" className="btn btn-secondary">
                  بازگشت
                </Link>
              </div>
            </div>
          </div>

          {!focusMode && (
            <div className="mx-auto w-full max-w-[280px] lg:mx-0">
              <SeoScorePanel {...seoScorePanelProps} variant="sidebar" />
            </div>
          )}
        </div>
      </div>
    </AdminPage>
  );
}
