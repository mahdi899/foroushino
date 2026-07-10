'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Save, Trash2 } from 'lucide-react';
import { deleteMiniCourse, saveMiniCourse } from './actions';
import type { AdminMiniCourse, AdminMiniCourseComment } from '@/lib/admin/miniCourseTypes';
import { parseAparatHash } from '@/lib/article/videoEmbed';
import { AdminPage } from '../../ui';
import { CoverImageField } from '../../content/CoverImageField';
import { ArticleBodyEditor } from '../../blog/ArticleBodyEditorLazy';
import { MiniCourseCommentsPanel } from './MiniCourseCommentsPanel';

export function MiniCourseForm({
  course,
  comments = [],
  commentsError = null,
}: {
  course?: AdminMiniCourse;
  comments?: AdminMiniCourseComment[];
  commentsError?: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    slug: course?.slug ?? '',
    title: course?.title ?? '',
    subtitle: course?.subtitle ?? '',
    summary: course?.summary ?? '',
    description: course?.description ?? '',
    thumbnail: course?.thumbnail ?? '',
    aparat_url: course?.aparat_url ?? course?.aparat_hash ?? '',
    level: course?.level ?? 'مقدماتی',
    duration: course?.duration ?? '',
    sort_order: course?.sort_order ?? 0,
    is_active: course?.is_active ?? true,
    comments_enabled: course?.comments_enabled ?? true,
    meta_title: course?.meta_title ?? '',
    meta_description: course?.meta_description ?? '',
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  function patch<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const publicHref = useMemo(
    () => (form.slug.trim() ? `/mini-courses/${form.slug.trim()}` : null),
    [form.slug],
  );

  const onSave = useCallback(async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      setError('عنوان و اسلاگ الزامی است.');
      return;
    }

    const aparatHash = parseAparatHash(form.aparat_url);
    if (!aparatHash) {
      setError('لینک یا شناسه آپارات نامعتبر است.');
      return;
    }

    setPending(true);
    setError('');
    setMessage('');

    const res = await saveMiniCourse(
      {
        slug: form.slug.trim(),
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        summary: form.summary.trim() || null,
        description: form.description || null,
        thumbnail: form.thumbnail.trim() || null,
        aparat_hash: aparatHash,
        level: form.level.trim() || null,
        duration: form.duration.trim() || null,
        sort_order: Number(form.sort_order) || 0,
        is_active: form.is_active,
        comments_enabled: form.comments_enabled,
        meta_title: form.meta_title.trim() || null,
        meta_description: form.meta_description.trim() || null,
      },
      course?.id,
    );

    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'ذخیره ناموفق بود.');
      return;
    }

    setMessage('ذخیره شد.');
    if (!course?.id && res.id) {
      router.push(`/admin/academy/mini-courses/${res.id}`);
    } else {
      router.refresh();
    }
  }, [course?.id, form, router]);

  async function onDelete() {
    if (!course?.id) return;
    if (!window.confirm('این مینی‌دوره حذف شود؟')) return;

    setPending(true);
    const res = await deleteMiniCourse(course.id);
    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'حذف ناموفق بود.');
      return;
    }

    router.push('/admin/academy/mini-courses');
  }

  return (
    <AdminPage
      title={course ? 'ویرایش مینی‌دوره' : 'مینی‌دوره جدید'}
      desc="ویدیو آپارات، تامبنیل، توضیحات و نظرات"
      icon="PlayCircle"
      headerVariant="academy"
      action={
        <div className="flex flex-wrap items-center gap-2">
          {publicHref ? (
            <Link href={publicHref} target="_blank" className="btn btn-secondary">
              <ExternalLink className="h-4 w-4" />
              مشاهده در سایت
            </Link>
          ) : null}
          {course ? (
            <button type="button" className="btn btn-danger" onClick={onDelete} disabled={pending}>
              <Trash2 className="h-4 w-4" />
              حذف
            </button>
          ) : null}
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
        </div>
      }
    >
      <div className="admin-form-grid">
        {error ? <div className="admin-form-error">{error}</div> : null}
        {message ? <div className="admin-form-success">{message}</div> : null}

        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__head">
            <h2 className="admin-dashboard-panel__title">اطلاعات اصلی</h2>
          </div>
          <div className="admin-dashboard-panel__body space-y-4">
            <label className="admin-field">
              <span className="admin-field__label">عنوان</span>
              <input
                className="admin-input"
                value={form.title}
                onChange={(e) => patch('title', e.target.value)}
                placeholder="مثال: مینی‌دوره الفبای کمپین‌نویسی"
              />
            </label>

            <label className="admin-field">
              <span className="admin-field__label">اسلاگ (انگلیسی)</span>
              <input
                className="admin-input font-mono"
                dir="ltr"
                value={form.slug}
                onChange={(e) => patch('slug', e.target.value)}
                placeholder="alfabe-kampain-nevisi"
              />
            </label>

            <label className="admin-field">
              <span className="admin-field__label">زیرعنوان</span>
              <input
                className="admin-input"
                value={form.subtitle}
                onChange={(e) => patch('subtitle', e.target.value)}
              />
            </label>

            <label className="admin-field">
              <span className="admin-field__label">خلاصه کوتاه (کارت)</span>
              <textarea
                className="admin-input min-h-20"
                value={form.summary}
                onChange={(e) => patch('summary', e.target.value)}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-field">
                <span className="admin-field__label">سطح</span>
                <input
                  className="admin-input"
                  value={form.level}
                  onChange={(e) => patch('level', e.target.value)}
                />
              </label>
              <label className="admin-field">
                <span className="admin-field__label">مدت</span>
                <input
                  className="admin-input"
                  value={form.duration}
                  onChange={(e) => patch('duration', e.target.value)}
                  placeholder="رایگان / ۹۰ دقیقه"
                />
              </label>
            </div>

            <label className="admin-field">
              <span className="admin-field__label">لینک ویدیو آپارات</span>
              <input
                className="admin-input font-mono text-sm"
                dir="ltr"
                value={form.aparat_url}
                onChange={(e) => patch('aparat_url', e.target.value)}
                placeholder="https://www.aparat.com/v/oyt346k"
              />
            </label>

            <CoverImageField
              label="تصویر تامبنیل"
              value={form.thumbnail}
              onChange={(url) => patch('thumbnail', url)}
            />

            <label className="admin-field">
              <span className="admin-field__label">ترتیب نمایش</span>
              <input
                type="number"
                className="admin-input w-32"
                value={form.sort_order}
                onChange={(e) => patch('sort_order', Number(e.target.value))}
                min={0}
              />
            </label>

            <div className="flex flex-wrap gap-6">
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => patch('is_active', e.target.checked)}
                />
                <span>فعال (نمایش در سایت)</span>
              </label>
              <label className="admin-checkbox">
                <input
                  type="checkbox"
                  checked={form.comments_enabled}
                  onChange={(e) => patch('comments_enabled', e.target.checked)}
                />
                <span>نظرات فعال</span>
              </label>
            </div>
          </div>
        </section>

        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__head">
            <h2 className="admin-dashboard-panel__title">توضیحات کامل</h2>
          </div>
          <div className="admin-dashboard-panel__body">
            <ArticleBodyEditor value={form.description} onChange={(html) => patch('description', html)} />
          </div>
        </section>

        <section className="admin-dashboard-panel">
          <div className="admin-dashboard-panel__head">
            <h2 className="admin-dashboard-panel__title">سئو</h2>
          </div>
          <div className="admin-dashboard-panel__body space-y-4">
            <label className="admin-field">
              <span className="admin-field__label">عنوان متا</span>
              <input
                className="admin-input"
                value={form.meta_title}
                onChange={(e) => patch('meta_title', e.target.value)}
              />
            </label>
            <label className="admin-field">
              <span className="admin-field__label">توضیح متا</span>
              <textarea
                className="admin-input min-h-20"
                value={form.meta_description}
                onChange={(e) => patch('meta_description', e.target.value)}
              />
            </label>
          </div>
        </section>

        {course ? (
          <MiniCourseCommentsPanel
            courseId={course.id}
            comments={comments}
            error={commentsError}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn btn-primary" onClick={onSave} disabled={pending}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            ذخیره
          </button>
          <Link href="/admin/academy/mini-courses" className="btn btn-secondary">
            بازگشت به فهرست
          </Link>
        </div>
      </div>
    </AdminPage>
  );
}
