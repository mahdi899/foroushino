import { Reveal } from '@/components/motion/Reveal';
import { MiniCourseCard } from '@/components/mini-courses/MiniCourseCard';
import { Eyebrow } from '@/components/ui/Eyebrow';
import type { MiniCourseApiRecord } from '@/lib/services/miniCourses.types';

type MiniCourseItem = {
  course: MiniCourseApiRecord;
  imageAlt: string;
  index: number;
};

export function MiniCoursesSection({ items }: { items: MiniCourseItem[] }) {
  if (items.length === 0) return null;

  return (
    <section
      id="mini-courses"
      aria-labelledby="mini-courses-heading"
      className="mini-courses-section relative isolate overflow-x-clip border-t border-bone/8 py-section-sm md:py-section"
    >
      <div
        aria-hidden
        className="mini-courses-section-ambient pointer-events-none absolute inset-x-0 top-0 h-[min(48vw,24rem)]"
      />

      <div className="container-luxe relative">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Eyebrow className="justify-center">Mini Courses</Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="mini-courses-heading"
              className="mx-auto mt-3 max-w-xl text-balance font-display text-xl text-bone md:text-h2"
            >
              مینی‌دوره‌ها
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mx-auto mt-4 max-w-2xl text-bone-dim">
              ویدیوهای کوتاه و رایگان برای ورود سریع به تفکر کمپین‌محور — قبل از مسیر اصلی.
            </p>
          </Reveal>
        </div>

        <div
          className={
            items.length === 1
              ? 'relative mx-auto mt-8 max-w-3xl md:mt-10'
              : 'relative mt-8 grid items-stretch gap-4 md:mt-10 md:grid-cols-2 md:gap-5 lg:gap-6'
          }
        >
          {items.map(({ course, imageAlt, index }) => (
            <MiniCourseCard
              key={course.slug}
              course={course}
              imageAlt={imageAlt}
              index={index}
              priority={index < 2}
              layout="catalog"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
