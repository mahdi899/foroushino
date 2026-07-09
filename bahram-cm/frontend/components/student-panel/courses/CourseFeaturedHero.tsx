import { Calendar, PlayCircle } from 'lucide-react';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';
import { StatusBadge } from '@/components/student-panel/ui/StatusBadge';
import type { StudentCourseAccess } from '@/components/student-panel/courses/CourseAccessCard';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

export function CourseFeaturedHero({ course }: { course: StudentCourseAccess }) {
  const title = course.product?.title ?? 'دوره';
  const image = course.product?.featured_image;
  const imageAlt = course.product?.featured_image_alt ?? title;

  return (
    <>
      <div className="relative h-44 overflow-hidden bg-surface-soft sm:h-52">
        {image ? (
          <DirectMediaImg
            src={image}
            alt={imageAlt}
            fill
            loading="eager"
            className="z-0 object-cover"
          />
        ) : (
          <div className="absolute inset-0 z-0 flex items-center justify-center bg-gradient-to-br from-primary/15 via-surface-soft to-accent/10">
            <PlayCircle className="h-12 w-12 text-primary/35" />
          </div>
        )}
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 z-[2] p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge
              variant={course.pending_activation ? 'warning' : course.is_active ? 'success' : 'neutral'}
            >
              {course.pending_activation
                ? 'در حال فعال‌سازی'
                : course.is_active
                  ? 'دسترسی فعال'
                  : 'غیرفعال'}
            </StatusBadge>
            <StatusBadge variant="neutral">دسترسی دائمی</StatusBadge>
          </div>
          <h2 className="mt-2 text-base font-bold leading-snug text-white sm:text-lg">{title}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 border-t border-border p-4 sm:grid-cols-3 sm:gap-0 sm:divide-x sm:divide-border sm:p-5">
        <div className="flex items-center gap-3 sm:px-3 sm:first:ps-0">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Calendar className="h-3.5 w-3.5" />
          </span>
          <div>
            <p className="panel-text-caption text-text-muted">تاریخ خرید</p>
            <p className="panel-text-body font-bold text-text">{formatDate(course.activated_at)}</p>
          </div>
        </div>
        <div className="sm:px-3">
          <p className="panel-text-caption text-text-muted">وضعیت دوره</p>
          <p className={`panel-text-body font-bold ${course.is_active ? 'text-primary' : 'text-text-muted'}`}>
            {course.is_active ? 'دسترسی فعال' : 'غیرفعال'}
          </p>
        </div>
        <div className="sm:px-3 sm:last:pe-0">
          <p className="panel-text-caption text-text-muted">نوع دسترسی</p>
          <p className="panel-text-body font-bold text-text">دسترسی دائمی</p>
        </div>
      </div>
    </>
  );
}
