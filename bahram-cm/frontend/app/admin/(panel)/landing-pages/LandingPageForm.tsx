'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { AdminPage } from '../ui';
import { CoverImageField } from '../content/CoverImageField';
import { deleteLandingPage, saveLandingPage } from './actions';
import type { AdminLandingPage } from '@/lib/admin/landingPagesData';

const empty: Partial<AdminLandingPage> = {
  title: '',
  slug: '',
  subtitle: '',
  body: '',
  hero_image: '',
  submit_label: '',
  success_message: '',
  form_fields: { message: false, email: false },
  is_published: false,
};

export function LandingPageForm({ landingPage }: { landingPage?: AdminLandingPage }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...empty, ...landingPage });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function patch(partial: Partial<typeof form>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  function patchFields(partial: Partial<AdminLandingPage['form_fields']>) {
    setForm((prev) => ({
      ...prev,
      form_fields: { ...(prev.form_fields ?? { message: false, email: false }), ...partial },
    }));
  }

  async function onSave() {
    if (!form.title?.trim()) {
      setError('عنوان صفحه الزامی است.');
      return;
    }

    setPending(true);
    setError('');
    setMessage('');

    const res = await saveLandingPage(
      {
        title: form.title.trim(),
        slug: form.slug?.trim() || null,
        subtitle: form.subtitle?.trim() || null,
        body: form.body?.trim() || null,
        hero_image: form.hero_image || null,
        submit_label: form.submit_label?.trim() || null,
        success_message: form.success_message?.trim() || null,
        form_fields: form.form_fields ?? { message: false, email: false },
        is_published: !!form.is_published,
      },
      landingPage?.id,
    );

    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'خطا');
      return;
    }

    setMessage('ذخیره شد.');
    if (!landingPage?.id && res.id) {
      router.push(`/admin/landing-pages/${res.id}`);
      router.refresh();
    } else {
      if (res.slug) patch({ slug: res.slug });
      router.refresh();
    }
  }

  async function onDelete() {
    if (!landingPage?.id || !confirm('این لندینگ حذف شود؟ ثبت‌نام‌های قبلی حذف نمی‌شوند اما ارتباط آن‌ها با این صفحه باقی می‌ماند.')) return;
    setPending(true);
    const res = await deleteLandingPage(landingPage.id, landingPage.slug);
    setPending(false);
    if (res.ok) {
      router.push('/admin/landing-pages');
      router.refresh();
    } else {
      setError(res.error ?? 'حذف ناموفق بود');
    }
  }

  return (
    <AdminPage
      title={landingPage ? `ویرایش: ${landingPage.title}` : 'لندینگ جدید'}
      desc={landingPage ? 'ویرایش محتوا و فیلدهای فرم این صفحه' : 'یک صفحه لندینگ برای جمع‌آوری نام و شماره بساز'}
      backHref="/admin/landing-pages"
      action={
        <div className="flex flex-wrap gap-2">
          {landingPage?.id && landingPage.is_published && (
            <Link
              href={`/admin/landing-pages/${landingPage.id}/submissions`}
              className="btn btn-secondary px-3 py-2 text-small"
            >
              ثبت‌نام‌ها ({landingPage.leads_count.toLocaleString('fa-IR')})
            </Link>
          )}
          {form.is_published && form.slug && (
            <Link href={`/l/${form.slug}`} target="_blank" className="btn btn-secondary px-3 py-2 text-small">
              <ExternalLink className="h-4 w-4" />
              پیش‌نمایش
            </Link>
          )}
          {landingPage?.id && (
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
      <div className="grid gap-6">
        <div className="card space-y-4 p-5">
          <h2 className="text-h3 font-bold text-primary-dark">محتوای صفحه</h2>

          <div>
            <label className="field-label">عنوان *</label>
            <input
              className="field-input"
              value={form.title ?? ''}
              onChange={(e) => patch({ title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="field-label">آدرس (slug)</label>
            <input
              className="field-input"
              dir="ltr"
              value={form.slug ?? ''}
              onChange={(e) => patch({ slug: e.target.value })}
              placeholder="مثلاً: campaign-shahrivar"
            />
            <p className="mt-1 text-caption text-text-muted">
              اگر خالی بماند، از روی عنوان ساخته می‌شود. آدرس نهایی: /l/{form.slug || '...'}
            </p>
          </div>

          <div>
            <label className="field-label">زیرعنوان</label>
            <input
              className="field-input"
              value={form.subtitle ?? ''}
              onChange={(e) => patch({ subtitle: e.target.value })}
              placeholder="یک جمله کوتاه زیر عنوان اصلی"
            />
          </div>

          <div>
            <label className="field-label">متن توضیحات</label>
            <textarea
              className="field-input min-h-[8rem]"
              value={form.body ?? ''}
              onChange={(e) => patch({ body: e.target.value })}
              placeholder="توضیح کامل‌تر درباره این پیشنهاد یا کمپین…"
            />
          </div>

          <CoverImageField
            label="تصویر هیرو (اختیاری)"
            value={form.hero_image ?? ''}
            onChange={(hero_image) => patch({ hero_image })}
            alt={form.title || 'تصویر هیرو لندینگ'}
          />

          <label className="flex items-center gap-2 text-small text-text">
            <input
              type="checkbox"
              checked={!!form.is_published}
              onChange={(e) => patch({ is_published: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            منتشر شود (در غیر این صورت صفحه عمومی ۴۰۴ می‌دهد)
          </label>
        </div>

        <div className="card space-y-4 p-5">
          <div>
            <h2 className="text-h3 font-bold text-primary-dark">فرم ثبت‌نام</h2>
            <p className="mt-1 text-caption text-text-muted">
              نام و شماره تماس همیشه در فرم هستند و اجباری‌اند. فیلدهای زیر اختیاری‌اند.
            </p>
          </div>

          <label className="flex items-center gap-2 text-small text-text">
            <input
              type="checkbox"
              checked={!!form.form_fields?.message}
              onChange={(e) => patchFields({ message: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            افزودن فیلد «توضیحات / پیام»
          </label>

          <label className="flex items-center gap-2 text-small text-text">
            <input
              type="checkbox"
              checked={!!form.form_fields?.email}
              onChange={(e) => patchFields({ email: e.target.checked })}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            افزودن فیلد «ایمیل»
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="field-label">متن دکمه ارسال</label>
              <input
                className="field-input"
                value={form.submit_label ?? ''}
                onChange={(e) => patch({ submit_label: e.target.value })}
                placeholder="پیش‌فرض: ارسال"
              />
            </div>
            <div>
              <label className="field-label">پیام بعد از ثبت موفق</label>
              <input
                className="field-input"
                value={form.success_message ?? ''}
                onChange={(e) => patch({ success_message: e.target.value })}
                placeholder="پیش‌فرض: ثبت شد، به‌زودی با شما تماس می‌گیریم."
              />
            </div>
          </div>
        </div>

        {error && <p className="text-small text-error">{error}</p>}
        {message && <p className="text-small text-success">{message}</p>}

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/landing-pages" className="btn btn-secondary">
            بازگشت
          </Link>
        </div>
      </div>
    </AdminPage>
  );
}
