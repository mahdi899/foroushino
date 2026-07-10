'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Maximize2, Save, Trash2 } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { deleteMiniCourse, saveMiniCourse } from './actions';
import type { AdminMiniCourse, AdminMiniCourseComment } from '@/lib/admin/miniCourseTypes';
import { aparatEmbedUrl, parseAparatHash } from '@/lib/article/videoEmbed';
import { resolveMiniCourseCover } from '@/lib/mini-courses/covers';
import { AdminPage, Badge } from '../../ui';
import { useAdminFocus } from '../../AdminFocusContext';
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
  const { focusMode, toggleFocusMode } = useAdminFocus();
  const [form, setForm] = useState({
    slug: course?.slug ?? '',
    title: course?.title ?? '',
    subtitle: course?.subtitle ?? '',
    summary: course?.summary ?? '',
    description: course?.description ?? '',
    thumbnail: course?.thumbnail ?? '',
    aparat_url: course?.aparat_url ?? course?.aparat_hash ?? '',
    level: course?.level ?? 'مقدماتی',
    duration: course?.duration ?? 'رایگان',
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

  function slugifyTitle(title: string): string {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  function onTitleChange(value: string) {
    setForm((prev) => {
      const next = { ...prev, title: value };
      if (!course?.id && !prev.slug.trim() && value.trim()) {
        const generated = slugifyTitle(value);
        if (/[a-z0-9]/.test(generated)) next.slug = generated;
      }
      if (!prev.meta_title.trim() && value.trim()) {
        next.meta_title = value.trim();
      }
      return next;
    });
  }

  const aparatPreviewHash = useMemo(() => parseAparatHash(form.aparat_url), [form.aparat_url]);
  const previewCover = useMemo(
    () => resolveMiniCourseCover(form.slug || 'preview', 0, form.thumbnail),
    [form.slug, form.thumbnail],
  );
  const publicHref = useMemo(
    () => (form.slug.trim() ? `/mini-courses/${form.slug.trim()}` : null),
    [form.slug],
  );
  const pendingComments = comments.filter((c) => c.status === 'pending').length;

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
      router.refresh();
    } else {
      router.refresh();
    }
  }, [course?.id, form, router]);

  async function onDelete() {
    if (!course?.id || !confirm('این مینی‌دوره حذف شود؟')) return;

    setPending(true);
    const res = await deleteMiniCourse(course.id);
    setPending(false);

    if (!res.ok) {
      setError(res.error ?? 'حذف ناموفق بود.');
      return;
    }

    router.push('/admin/academy/mini-courses');
    router.refresh();
  }

  return (
    <AdminPage
      title={course ? `ویرایش: ${course.title}` : 'مینی‌دوره جدید'}
      desc={course ? 'ویرایش محتوا، ویدیو و تنظیمات نمایش' : 'افزودن مینی‌دوره رایگان با ویدیو آپارات'}
      icon="PlayCircle"
      headerVariant="academy"
      stackHeader
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
          {publicHref && form.is_active ? (
            <Link href={publicHref} target="_blank" className="btn btn-secondary px-3 py-2 text-small">
              <ExternalLink className="h-4 w-4" />
              پیش‌نمایش
            </Link>
          ) : null}
          {course?.id ? (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={pending}
              className="btn btn-secondary px-3 py-2 text-small text-error"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => void onSave()}
            disabled={pending || !form.title.trim()}
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

              <label>
                <span className="field-label">عنوان *</span>
                <input
                  className="field-input"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  placeholder="مثال: مینی‌دوره الفبای کمپین‌نویسی"
                  required
                />
              </label>

              <label>
                <span className="field-label">اسلاگ (لاتین) *</span>
                <input
                  className="field-input font-mono text-small"
                  dir="ltr"
                  value={form.slug}
                  onChange={(e) => patch('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="alfabe-kampain-nevisi"
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                />
                <p className="mt-1 text-center text-caption text-text-muted md:text-start">
                  آدرس صفحه: /mini-courses/{form.slug || '…'}
                </p>
              </label>

              <label>
                <span className="field-label">زیرعنوان</span>
                <input
                  className="field-input"
                  value={form.subtitle}
                  onChange={(e) => patch('subtitle', e.target.value)}
                  placeholder="ورود سریع به تفکر کمپین‌محور"
                />
              </label>

              <label>
                <span className="field-label">خلاصه کارت *</span>
                <textarea
                  className="field-input"
                  rows={3}
                  value={form.summary}
                  onChange={(e) => patch('summary', e.target.value)}
                  placeholder="یک یا دو جمله برای نمایش در کارت دوره‌ها"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label>
                  <span className="field-label">سطح</span>
                  <input
                    className="field-input"
                    value={form.level}
                    onChange={(e) => patch('level', e.target.value)}
                    placeholder="مقدماتی"
                  />
                </label>
                <label>
                  <span className="field-label">مدت</span>
                  <input
                    className="field-input"
                    value={form.duration}
                    onChange={(e) => patch('duration', e.target.value)}
                    placeholder="رایگان"
                  />
                </label>
              </div>
            </div>

            <div className="card space-y-4 p-6">
              <h2 className="text-center text-h3 font-bold text-primary-dark md:text-start">ویدیو و تصویر</h2>

              <label>
                <span className="field-label">لینک ویدیو آپارات *</span>
                <input
                  className="field-input font-mono text-small"
                  dir="ltr"
                  value={form.aparat_url}
                  onChange={(e) => patch('aparat_url', e.target.value)}
                  placeholder="https://www.aparat.com/v/oyt346k"
                />
              </label>

              {aparatPreviewHash ? (
                <div className="overflow-hidden rounded-xl border border-border bg-surface-soft">
                  <iframe
                    title="پیش‌نمایش آپارات"
                    src={aparatEmbedUrl(aparatPreviewHash)}
                    className="aspect-video w-full"
                    allowFullScreen
                  />
                </div>
              ) : (
                <p className="text-center text-caption text-text-muted md:text-start">
                  لینک آپارات را وارد کنید تا پیش‌نمایش ویدیو نمایش داده شود.
                </p>
              )}

              <CoverImageField
                label="تصویر تامبنیل (افقی ۱۶:۹)"
                value={form.thumbnail}
                onChange={(url) => patch('thumbnail', url)}
                alt={form.title || 'تامبنیل مینی‌دوره'}
              />
              <p className="text-center text-caption text-text-muted md:text-start">
                اگر تامبنیل خالی باشد، سایت از تصویر پیش‌فرض استفاده می‌کند.
              </p>
            </div>

            <div className="card p-6">
              <ArticleBodyEditor
                label="توضیحات صفحه دوره"
                value={form.description}
                onChange={(html) => patch('description', html)}
                placeholder="توضیحات کامل مینی‌دوره را بنویسید…"
              />
            </div>

            <div className="card space-y-4 p-6">
              <div className="border-b border-border pb-3">
                <h2 className="text-center text-h3 font-bold text-primary-dark md:text-start">تنظیمات SEO</h2>
              </div>
              <label>
                <span className="field-label">Meta Title</span>
                <input
                  className="field-input"
                  value={form.meta_title}
                  onChange={(e) => patch('meta_title', e.target.value)}
                  placeholder={form.title || 'عنوان صفحه'}
                />
              </label>
              <label>
                <span className="field-label">Meta Description</span>
                <textarea
                  className="field-input min-h-[4rem]"
                  value={form.meta_description}
                  onChange={(e) => patch('meta_description', e.target.value)}
                  placeholder={form.summary || 'خلاصه برای نتایج جستجو…'}
                />
              </label>
            </div>

            {course ? (
              <MiniCourseCommentsPanel
                courseId={course.id}
                comments={comments}
                error={commentsError}
              />
            ) : null}

            <div className="card space-y-4 p-6">
              {error ? <p className="text-center text-small text-error md:text-start">{error}</p> : null}
              {message ? <p className="text-center text-small text-success md:text-start">{message}</p> : null}
              <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                <Link href="/admin/academy/mini-courses" className="btn btn-secondary">
                  بازگشت به فهرست
                </Link>
              </div>
            </div>
          </div>

          {!focusMode ? (
            <aside className="mx-auto w-full max-w-[280px] space-y-4 lg:mx-0">
              <div className="card space-y-4 p-5">
                <h3 className="text-small font-bold text-primary-dark">وضعیت انتشار</h3>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => patch('is_active', e.target.checked)}
                  />
                  <span className="text-small">فعال — نمایش در سایت</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.comments_enabled}
                    onChange={(e) => patch('comments_enabled', e.target.checked)}
                  />
                  <span className="text-small">نظرات فعال</span>
                </label>

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

                <div className="flex flex-wrap gap-2">
                  <Badge tone={form.is_active ? 'success' : 'default'}>
                    {form.is_active ? 'فعال' : 'غیرفعال'}
                  </Badge>
                  {course && pendingComments > 0 ? (
                    <Badge tone="warning">{pendingComments.toLocaleString('fa-IR')} نظر در انتظار</Badge>
                  ) : null}
                </div>
              </div>

              <div className="card overflow-hidden p-0">
                <div className="border-b border-border px-4 py-3">
                  <h3 className="text-small font-bold text-primary-dark">پیش‌نمایش کارت</h3>
                </div>
                <div className="relative aspect-video w-full bg-surface-soft">
                  <DirectMediaImg
                    admin
                    src={previewCover}
                    alt={form.title || 'پیش‌نمایش'}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-2 p-4">
                  <p className="line-clamp-2 text-small font-bold text-primary-dark">
                    {form.title || 'عنوان مینی‌دوره'}
                  </p>
                  {form.subtitle ? (
                    <p className="line-clamp-2 text-caption text-text-muted">{form.subtitle}</p>
                  ) : null}
                  {publicHref ? (
                    <Link
                      href={publicHref}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-caption text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      مشاهده صفحه
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </AdminPage>
  );
}
