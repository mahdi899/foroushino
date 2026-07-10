import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { Badge } from '@/components/ui/Badge';
import { SiteImage } from '@/components/ui/SiteImage';
import { Chip } from '@/components/ui/Chip';
import type { MiniCourseApiRecord } from '@/lib/services/miniCourses';

type MiniCourseCardProps = {
  course: MiniCourseApiRecord;
  imageAlt: string;
  index?: number;
  priority?: boolean;
};

export function MiniCourseCard({ course, imageAlt, index = 0, priority = false }: MiniCourseCardProps) {
  const href = `/mini-courses/${course.slug}`;

  return (
    <Reveal delay={index * 0.05}>
      <Link
        href={href}
        data-neon-tone={index % 2 === 0 ? 'emerald' : 'gold'}
        className="neon-surface-hover group relative flex h-full flex-col overflow-hidden rounded-card border border-bone/10 bg-charcoal/55 transition-colors hover:border-bone/25"
      >
        <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-charcoal/80">
          {course.thumbnail ? (
            <SiteImage
              src={course.thumbnail}
              alt={imageAlt}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-[var(--ease-luxe)] group-hover:scale-[1.04]"
              priority={priority}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-caption text-mist">بدون تصویر</div>
          )}
          <div className="pointer-events-none absolute inset-0 photo-scrim-bottom-soft" aria-hidden />
          {course.level ? (
            <div className="absolute end-4 top-4">
              <Badge>{course.level}</Badge>
            </div>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5 md:p-6">
          <h2 className="text-h3 text-balance text-bone">{course.title}</h2>
          {course.subtitle ? <p className="mt-2 text-caption text-mist">{course.subtitle}</p> : null}
          {course.summary ? <p className="mt-3 grow text-bone-dim">{course.summary}</p> : null}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-bone/8 pt-5">
            {course.duration ? (
              <Chip>
                <Clock className="me-1.5 h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
                {course.duration}
              </Chip>
            ) : (
              <span />
            )}
            <span className="inline-flex items-center gap-1.5 text-caption text-gold">
              مشاهده دوره
              <ArrowLeft
                className="rtl-flip h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}
