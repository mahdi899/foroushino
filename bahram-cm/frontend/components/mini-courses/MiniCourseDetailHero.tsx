import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Clapperboard, Clock, PenLine, Sparkles } from 'lucide-react';
import { MiniCourseEnrollCta } from '@/components/mini-courses/MiniCourseEnrollCta';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
import { cn } from '@/lib/cn';
import { miniCourseCardTone, resolveMiniCourseCover } from '@/lib/mini-courses/covers';
import type { MiniCourseApiRecord } from '@/lib/services/miniCourses.types';

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  'alfabe-kampain-nevisi': PenLine,
  'senario-nevisi': Clapperboard,
};

function cardIcon(slug: string): LucideIcon {
  return ICON_BY_SLUG[slug] ?? Sparkles;
}

type MiniCourseDetailHeroProps = {
  course: MiniCourseApiRecord;
  imageAlt: string;
  descriptionHtml?: string | null;
  isEnrolled: boolean;
  enrollmentNumber?: string | null;
};

export function MiniCourseDetailHero({
  course,
  imageAlt,
  descriptionHtml,
  isEnrolled,
  enrollmentNumber,
}: MiniCourseDetailHeroProps) {
  const cover = resolveMiniCourseCover(course.slug, 0, course.thumbnail);
  const tone = miniCourseCardTone(course.slug);
  const Icon = cardIcon(course.slug);

  return (
    <div className={cn('mini-course-detail', `mini-course-detail--${tone}`)} data-mini-tone={tone}>
      <section className="mini-course-detail-hero" aria-label="کاور مینی‌دوره">
        <Reveal className="h-full">
          <div className="mini-course-detail-hero__stage">
            <SiteImage
              src={cover}
              alt={imageAlt}
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            <div className="mini-course-detail-hero__scrim" aria-hidden />
            <Link
              href="/courses#mini-courses"
              className="mini-course-detail-hero__back inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              بازگشت به دوره‌ها
            </Link>

            <span className="mini-course-detail-hero__badge">رایگان</span>

            <div className="mini-course-detail-hero__cta">
              <MiniCourseEnrollCta
                slug={course.slug}
                isEnrolled={isEnrolled}
                enrollmentNumber={enrollmentNumber}
                variant="overlay"
              />
            </div>
          </div>
        </Reveal>
      </section>

      <div className="container-luxe max-w-4xl mini-course-detail__content">
        <Reveal delay={0.08}>
          <header className="mini-course-detail__header">
            <div className="mini-course-detail__intro">
              <h1 className="mini-course-detail__title">{course.title}</h1>

              {course.subtitle ? (
                <p className="mini-course-detail__subtitle">{course.subtitle}</p>
              ) : null}

              {course.summary ? <p className="mini-course-detail__summary">{course.summary}</p> : null}
            </div>

            <div className="mini-course-detail__card">
              <div className="mini-course-detail__meta">
                <span
                  className={cn(
                    'mini-course-detail__icon',
                    tone === 'gold' ? 'mini-course-detail__icon--gold' : 'mini-course-detail__icon--teal',
                  )}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" strokeWidth={1.65} />
                </span>
                <span className="mini-course-detail__tag">مینی‌دوره</span>
                {course.level ? <span className="mini-course-detail__chip">{course.level}</span> : null}
                {course.duration ? (
                  <span className="mini-course-detail__chip mini-course-detail__chip--duration">
                    <Clock className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                    {course.duration}
                  </span>
                ) : null}
              </div>

              {isEnrolled && enrollmentNumber ? (
                <p className="mini-course-detail__order">
                  شماره سفارش:{' '}
                  <span className="num-latin font-medium text-bone" dir="ltr">
                    {enrollmentNumber}
                  </span>
                </p>
              ) : null}
            </div>
          </header>
        </Reveal>

        {descriptionHtml ? (
          <Reveal delay={0.14}>
            <div className="mini-course-detail__body">
              <h2 className="mini-course-detail__body-title">درباره این مینی‌دوره</h2>
              <article
                className="prose-luxe text-bone-dim"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </div>
  );
}
