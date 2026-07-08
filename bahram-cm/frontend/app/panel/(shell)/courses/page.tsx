import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen, Play, PlayCircle, Send, MessageSquare, Bot, Shield, Headset, Calendar, ExternalLink
} from 'lucide-react';
import { studentFetch } from '@/lib/student/session';

export const metadata: Metadata = { title: 'دوره من | پنل کاربری', robots: { index: false, follow: false } };

interface CourseAccess {
  id: number;
  product: { id: number; title: string; slug: string; spotplayer_course_id?: string | null } | null;
  status: string;
  is_active: boolean;
  activated_at: string | null;
  spotplayer: { status: string; license_url: string | null; spotplayer_course_id?: string | null } | null;
}

export default async function PanelCoursesPage() {
  const { data: courses } = await studentFetch<{ data: CourseAccess[] }>('/courses');

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '---';
    try {
      return new Date(dateStr).toLocaleDateString('fa-IR');
    } catch {
      return '---';
    }
  };

  if (courses.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <h1 className="text-xl font-bold text-text">دوره من</h1>
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <BookOpen size={32} />
          </div>
          <div>
            <h2 className="text-base font-bold text-text">هیچ دوره‌ای یافت نشد</h2>
            <p className="mt-2 text-xs text-text-muted">هنوز دوره‌ای برای شما فعال نشده است.</p>
          </div>
        </div>
      </div>
    );
  }

  // Use the first course as the active course to show the detailed dashboard
  const activeCourse = courses[0];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-text-muted">
        <span>دوره من</span>
        <span>/</span>
        <span className="text-text font-medium">{activeCourse.product?.title ?? 'دوره شغل کمپین‌نویسی'}</span>
      </div>

      {/* Header Section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-glow">
              <PlayCircle size={24} className="text-primary" />
            </div>
            <h1 className="text-xl font-bold text-text">{activeCourse.product?.title ?? 'دوره شغل کمپین‌نویسی'}</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`badge ${activeCourse.is_active ? 'badge-success' : 'badge-neutral'}`}>
              {activeCourse.is_active ? 'دسترسی فعال' : 'غیرفعال'}
            </span>
            <span className="badge badge-neutral">دسترسی دائمی</span>
          </div>
        </div>

        {/* Info Card */}
        <div className="card flex flex-row flex-wrap items-center justify-between gap-6 p-4 lg:w-auto">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted">تاریخ خرید</span>
            <span className="text-xs font-bold text-text">{formatDate(activeCourse.activated_at)}</span>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted">وضعیت دوره</span>
            <span className={`text-xs font-bold ${activeCourse.is_active ? 'text-green-500' : 'text-text-muted'}`}>
              {activeCourse.is_active ? 'دسترسی فعال' : 'غیرفعال'}
            </span>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-text-muted">نوع دسترسی</span>
            <span className="text-xs font-bold text-text">دسترسی دائمی</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column (Larger) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* SpotPlayer Card */}
          <div className="card overflow-hidden p-6 relative">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/5 text-primary border border-primary/20">
                  <svg className="h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M8 5V19L19 12L8 5Z" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-bold text-text">SpotPlayer</h3>
                  <p className="mt-1 text-xs text-text-muted leading-relaxed">
                    تمام محتوای این دوره در اسپات‌پلیر قابل مشاهده است.
                  </p>
                </div>
              </div>
              {activeCourse.is_active && activeCourse.spotplayer?.license_url ? (
                <Link
                  href={`/panel/courses/${activeCourse.id}/watch`}
                  className="btn btn-primary w-full sm:w-auto"
                >
                  <Play size={16} className="fill-current" />
                  ورود به دوره
                </Link>
              ) : (
                <span className="text-xs text-text-muted bg-surface-soft px-3 py-2 rounded-xl text-center border border-border/40">
                  لینک دوره به‌زودی فعال می‌شود.
                </span>
              )}
            </div>
            <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-primary/5 blur-2xl" />
          </div>

          {/* Important Links Card */}
          <div className="card p-6">
            <h3 className="text-sm font-bold text-text mb-4">لینک‌های مهم دوره</h3>
            <div className="flex flex-col gap-3">
              <a
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-soft p-3.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                    <Send size={16} />
                  </div>
                  <span className="text-xs font-semibold text-text">کانال تلگرام دوره</span>
                </div>
                <span className="text-[10px] text-text-muted">اطلاع‌رسانی‌ها و نکات مهم</span>
              </a>

              <a
                href="#"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-soft p-3.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500">
                    <MessageSquare size={16} />
                  </div>
                  <span className="text-xs font-semibold text-text">کانال روبیکا دوره</span>
                </div>
                <span className="text-[10px] text-text-muted">اطلاع‌رسانی‌ها و نکات مهم</span>
              </a>

              <a
                href="https://t.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-xl border border-border/40 bg-surface-soft p-3.5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-500/10 text-green-500">
                    <Bot size={16} />
                  </div>
                  <span className="text-xs font-semibold text-text">ربات تلگرام دوره</span>
                </div>
                <span className="text-[10px] text-text-muted">دسترسی سریع به خدمات</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right Column (Smaller) */}
        <div className="flex flex-col gap-6">
          {/* Guide Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen size={18} />
              </div>
              <h3 className="text-sm font-bold text-text">راهنمای نصب و استفاده</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-5">
              با مطالعه این راهنما، به‌راحتی پلیر را نصب و از دوره استفاده کنید.
            </p>
            <button type="button" className="btn btn-secondary w-full text-xs py-2.5">
              مشاهده راهنما
            </button>
          </div>

          {/* Support Card */}
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Headset size={18} />
              </div>
              <h3 className="text-sm font-bold text-text">مشکل در دسترسی؟</h3>
            </div>
            <p className="text-xs text-text-muted leading-relaxed mb-5">
              اگر در ورود به اسپات‌پلیر یا مشاهده محتوا مشکلی دارید، تیم پشتیبانی آماده کمک است.
            </p>
            <Link href="/panel/support" className="btn btn-primary w-full text-xs py-2.5">
              ثبت تیکت پشتیبانی
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Banner */}
      <div className="card flex flex-col sm:flex-row items-center gap-3 p-4 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <Shield size={18} className="text-primary shrink-0" />
        <p className="text-xs text-text-muted leading-relaxed text-center sm:text-right">
          محتوای دوره به صورت امن و اختصاصی ارائه می‌شود و امکان دانلود فایل‌های ویدئویی وجود ندارد.
        </p>
      </div>

      {/* Other Courses List (if any) */}
      {courses.length > 1 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-text mb-3">سایر دوره‌های شما</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courses.slice(1).map((course) => (
              <div key={course.id} className="card flex items-center justify-between p-4">
                <div>
                  <h4 className="text-xs font-bold text-text">{course.product?.title ?? 'دوره'}</h4>
                  <span className={`badge mt-1.5 ${course.is_active ? 'badge-success' : 'badge-neutral'}`}>
                    {course.is_active ? 'فعال' : 'غیرفعال'}
                  </span>
                </div>
                {course.is_active && course.spotplayer?.license_url ? (
                  <Link
                    href={`/panel/courses/${course.id}/watch`}
                    className="btn btn-secondary text-xs py-1.5 px-3"
                  >
                    <ExternalLink size={12} />
                    ورود به دوره
                  </Link>
                ) : (
                  <span className="text-[10px] text-text-muted">غیرفعال</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
