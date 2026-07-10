import Link from 'next/link';
import { Calendar, KeyRound, Play } from 'lucide-react';
import { CopyTextButton } from '@/components/student-panel/ui/CopyTextButton';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';

export interface StudentCourseAccess {
  list_key: string;
  id: number | null;
  course_type?: 'product' | 'mini';
  license_id?: number | null;
  order_id?: number | null;
  product: {
    id: number;
    title: string;
    slug: string;
    featured_image?: string | null;
    featured_image_alt?: string | null;
    spotplayer_course_id?: string | null;
  } | null;
  status: string;
  is_active: boolean;
  pending_activation?: boolean;
  order_number?: string | null;
  activated_at: string | null;
  spotplayer: {
    status: string;
    license_url: string | null;
    license_key?: string | null;
    spotplayer_course_id?: string | null;
  } | null;
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

export function CourseAccessCard({
  course,
  showLicenseKey = true,
}: {
  course: StudentCourseAccess;
  showLicenseKey?: boolean;
}) {
  const title = course.product?.title ?? 'دوره';
  const image = course.product?.featured_image;
  const imageAlt = course.product?.featured_image_alt ?? title;
  const isMiniCourse = course.course_type === 'mini';
  const slug = course.product?.slug;
  const licenseKey = course.spotplayer?.license_key;
  const spotplayerCourseId = course.spotplayer?.spotplayer_course_id ?? course.product?.spotplayer_course_id;
  const hasSpotPlayer = Boolean(spotplayerCourseId);
  const canWatch = isMiniCourse
    ? Boolean(course.is_active && slug)
    : Boolean(course.id) && course.is_active && Boolean(licenseKey) && hasSpotPlayer;
  const watchHref = isMiniCourse && slug
    ? `/panel/mini-courses/${slug}/watch`
    : course.id && course.license_id
      ? `/panel/courses/${course.id}/watch?license=${course.license_id}`
      : course.id
        ? `/panel/courses/${course.id}/watch`
        : null;

  return (
    <article className="card group flex h-full flex-col overflow-hidden transition hover:border-primary/30 hover:shadow-glow">
      <div className="relative aspect-[16/9] overflow-hidden border-b border-border bg-surface-soft">
        {image ? (
          <DirectMediaImg
            src={image}
            alt={imageAlt}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/15 via-surface-soft to-accent/10">
            <Play className="h-10 w-10 text-primary/40" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
          <h3 className="text-sm font-bold leading-snug text-white">{title}</h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            variant={course.pending_activation ? 'warning' : course.is_active ? 'success' : 'neutral'}
          >
            {course.pending_activation
              ? 'در حال فعال‌سازی'
              : course.is_active
                ? isMiniCourse
                  ? 'مینی‌دوره فعال'
                  : 'دسترسی فعال'
                : 'غیرفعال'}
          </StatusBadge>
          {course.order_number ? (
            <span className="panel-text-caption font-medium text-text-muted num-latin" dir="ltr">
              {isMiniCourse ? 'ثبت‌نام: ' : ''}
              {course.order_number}
            </span>
          ) : null}
        </div>

        <div className="panel-text-meta flex items-center gap-2 text-text-muted">
          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span>{isMiniCourse ? 'تاریخ ثبت‌نام' : 'تاریخ خرید'}: {formatDate(course.activated_at)}</span>
        </div>

        {!isMiniCourse && licenseKey && showLicenseKey ? (
          <div className="rounded-xl border border-border/60 bg-surface-soft/60 p-3">
            <div className="panel-text-meta mb-2 flex items-center gap-1.5 font-medium text-text-muted">
              <KeyRound className="h-3.5 w-3.5" />
              توکن لایسنس SpotPlayer
            </div>
            <CopyTextButton value={licenseKey} label="کپی توکن" showValue={false} className="w-full" />
          </div>
        ) : !isMiniCourse && hasSpotPlayer ? (
          <p className="panel-text-meta rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 leading-relaxed text-text-muted">
            لایسنس SpotPlayer این دوره در حال صدور است.
          </p>
        ) : null}
      </div>

      <div className="border-t border-border p-4">
        {canWatch && watchHref ? (
          <Link href={watchHref} className="btn btn-primary w-full">
            <Play size={16} className="fill-current" />
            تماشای دوره
          </Link>
        ) : (
          <span className="panel-text-meta flex w-full items-center justify-center rounded-xl border border-border/40 bg-surface-soft px-4 py-2.5 text-center text-text-muted">
            {!isMiniCourse && !hasSpotPlayer
              ? 'این محصول پخش آنلاین SpotPlayer ندارد'
              : course.is_active
                ? 'لایسنس دوره به‌زودی فعال می‌شود'
                : 'دسترسی این دوره غیرفعال است'}
          </span>
        )}
      </div>
    </article>
  );
}
