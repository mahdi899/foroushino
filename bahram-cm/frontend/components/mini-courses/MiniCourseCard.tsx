import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowLeft, Clapperboard, Clock, PenLine, Play, Sparkles } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
import { cn } from '@/lib/cn';
import { liveIconArrow } from '@/lib/iconMotion';
import {
  miniCourseCardTone,
  resolveMiniCourseCover,
} from '@/lib/mini-courses/covers';
import type { MiniCourseApiRecord } from '@/lib/services/miniCourses.types';

const ICON_BY_SLUG: Record<string, LucideIcon> = {
  'alfabe-kampain-nevisi': PenLine,
  'senario-nevisi': Clapperboard,
};

function cardIcon(slug: string): LucideIcon {
  return ICON_BY_SLUG[slug] ?? Sparkles;
}

type MiniCourseCardProps = {
  course: MiniCourseApiRecord;
  imageAlt: string;
  index?: number;
  priority?: boolean;
  layout?: 'catalog' | 'grid' | 'compact';
};

export function MiniCourseCard({
  course,
  imageAlt,
  index = 0,
  priority = false,
  layout = 'catalog',
}: MiniCourseCardProps) {
  const href = `/mini-courses/${course.slug}`;
  const tone = miniCourseCardTone(course.slug, index);
  const image = resolveMiniCourseCover(course.slug, index, course.thumbnail);
  const Icon = cardIcon(course.slug);
  const isCatalog = layout === 'catalog';
  const isCompact = layout === 'compact';

  if (isCompact) {
    return (
      <Reveal delay={0.04 + index * 0.04} className="h-full">
        <Link
          href={href}
          data-mini-tone={tone}
          className="mini-course-card mini-course-card--compact group relative flex h-full min-h-0 flex-col overflow-hidden rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/35 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <div className="mini-course-card-media relative aspect-[32/9] w-full shrink-0 overflow-hidden">
            <SiteImage
              src={image}
              alt={imageAlt}
              fill
              className="object-cover object-center transition-transform duration-500 ease-[var(--ease-luxe)] group-hover:scale-[1.03]"
              sizes="(max-width: 767px) 50vw, 25vw"
              priority={priority}
            />
            <div className="mini-course-card-play mini-course-card-play--compact" aria-hidden>
              <Play className="h-3 w-3 fill-current" strokeWidth={0} />
            </div>
            <span className="mini-course-card-free mini-course-card-free--compact">رایگان</span>
          </div>

          <div className="mini-course-card-body mini-course-card-body--compact relative z-[1] flex min-h-[3.75rem] min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3.5 sm:min-h-[4rem] sm:px-4 sm:py-4">
            <h3 className="line-clamp-2 text-[0.9rem] font-medium leading-[1.45] text-bone-dim transition-colors duration-300 group-hover:text-bone sm:text-[0.95rem]">
              {course.title}
            </h3>
            <span className="mini-course-card-arrow inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-bone/10 bg-bone/[0.04] text-mist transition-[background,border-color,color] duration-300 group-hover:border-bone/16 group-hover:bg-bone/[0.07] group-hover:text-bone">
              <ArrowLeft
                className={liveIconArrow('h-3.5 w-3.5')}
                strokeWidth={2}
                aria-hidden
              />
            </span>
          </div>
        </Link>
      </Reveal>
    );
  }

  return (
    <Reveal delay={0.08 + index * 0.06} className="h-full">
      <Link
        href={href}
        data-mini-tone={tone}
        className="mini-course-card group relative flex h-full min-h-0 flex-col overflow-hidden rounded-card-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
      >
        <div className="mini-course-card-media relative aspect-[16/9] w-full shrink-0 overflow-hidden">
          <SiteImage
            src={image}
            alt={imageAlt}
            fill
            className="object-cover object-center transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.05]"
            sizes={
              isCatalog
                ? '(max-width: 767px) 100vw, 50vw'
                : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            }
            priority={priority}
          />
          <div className="mini-course-card-play" aria-hidden>
            <Play className="h-4 w-4 fill-current" strokeWidth={0} />
          </div>
          <span className="mini-course-card-free">رایگان</span>
        </div>

        <div className="mini-course-card-body relative z-[1] flex flex-1 flex-col justify-between gap-4 p-5 md:gap-5 md:p-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span
                className={cn(
                  'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-sm',
                  tone === 'gold'
                    ? 'border-gold/30 bg-gold/10 text-gold shadow-[0_0_18px_-6px_rgba(255,176,0,0.45)]'
                    : 'border-emerald-glow/30 bg-emerald-glow/10 text-emerald-glow shadow-[0_0_18px_-6px_rgba(37,160,166,0.42)]',
                )}
              >
                <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.65} aria-hidden />
              </span>
              {course.level ? <span className="mini-course-card-level">{course.level}</span> : null}
            </div>

            <h3 className="mt-4 font-display text-[1.35rem] font-bold leading-[1.15] tracking-[-0.02em] text-bone md:text-[1.5rem]">
              {course.title}
            </h3>

            {course.subtitle ? (
              <p
                className={cn(
                  'mt-2 text-base font-semibold leading-snug md:text-lg',
                  tone === 'gold' ? 'text-gold' : 'text-emerald-glow',
                )}
              >
                {course.subtitle}
              </p>
            ) : null}

            {course.summary ? (
              <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-bone-dim md:line-clamp-3 md:text-[0.95rem]">
                {course.summary}
              </p>
            ) : null}

            {course.duration ? (
              <p className="mt-3 inline-flex items-center gap-1.5 text-sm text-mist">
                <Clock className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {course.duration}
              </p>
            ) : null}
          </div>

          <div className="flex justify-start">
            <span className="main-path-card-cta mini-course-card-cta inline-flex min-h-11 min-w-[10.5rem] shrink-0 items-center justify-center gap-2.5 rounded-pill px-6 py-3 text-sm font-semibold transition-[background,box-shadow,transform] duration-300 ease-[var(--ease-luxe)] md:min-h-12 md:min-w-[12rem] md:gap-3 md:px-7 md:text-body">
              <span>شروع دوره رایگان</span>
              <ArrowLeft className={liveIconArrow('h-4 w-4')} strokeWidth={2.2} aria-hidden />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
