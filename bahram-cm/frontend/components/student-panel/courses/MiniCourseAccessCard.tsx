import Link from 'next/link';
import { Clapperboard, Play } from 'lucide-react';
import type { StudentCourseAccess } from '@/components/student-panel/courses/CourseAccessCard';
import { DirectMediaImg } from '@/components/ui/DirectMediaImg';

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fa-IR');
  } catch {
    return '—';
  }
}

export function MiniCourseAccessCard({ course }: { course: StudentCourseAccess }) {
  const title = course.product?.title ?? 'مینی‌دوره';
  const slug = course.product?.slug;
  const image = course.product?.featured_image;
  const imageAlt = course.product?.featured_image_alt ?? title;
  const watchHref = slug ? `/panel/mini-courses/${slug}/watch` : null;

  if (!watchHref) {
    return null;
  }

  return (
    <article className="panel-mini-course-card">
      <div className="panel-mini-course-card__row">
        <div className="panel-mini-course-card__cover" aria-hidden>
          {image ? (
            <DirectMediaImg
              src={image}
              alt={imageAlt}
              fill
              className="object-cover"
            />
          ) : (
            <span className="panel-mini-course-card__cover-fallback">
              <Clapperboard className="h-5 w-5" strokeWidth={1.75} />
            </span>
          )}
        </div>

        <div className="panel-mini-course-card__body">
          <p className="panel-mini-course-card__title">{title}</p>
          <p className="panel-mini-course-card__meta">
            <span className="panel-mini-course-card__tag">رایگان</span>
            <span aria-hidden>·</span>
            <span>{formatDate(course.activated_at)}</span>
            {course.order_number ? (
              <>
                <span aria-hidden>·</span>
                <span className="num-latin" dir="ltr">
                  {course.order_number}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <Link href={watchHref} className="panel-mini-course-card__action">
          <Play className="panel-mini-course-card__action-icon" aria-hidden />
          <span>تماشای ویدیو</span>
        </Link>
      </div>
    </article>
  );
}
