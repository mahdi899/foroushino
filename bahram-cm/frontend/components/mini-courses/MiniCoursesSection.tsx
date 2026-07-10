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
      className="mini-courses-section relative isolate overflow-x-clip py-10 md:py-12"
    >
      <div
        aria-hidden
        className="mini-courses-section-ambient pointer-events-none absolute inset-x-0 top-0 h-[min(28vw,12rem)]"
      />

      <div className="container-luxe relative">
        <div className="mx-auto max-w-xl text-center">
          <Reveal>
            <Eyebrow className="mini-courses-section__eyebrow justify-center text-[0.65rem] tracking-[0.22em] text-mist">
              Mini Courses
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.06}>
            <h2
              id="mini-courses-heading"
              className="mini-courses-section__title mx-auto mt-2 max-w-md text-balance font-display text-lg font-semibold text-bone-dim md:text-xl"
            >
              مینی‌دوره‌ها
            </h2>
          </Reveal>
        </div>

        <div
          className={
            items.length === 1
              ? 'relative mx-auto mt-5 max-w-md md:mt-6'
              : 'relative mt-5 grid items-stretch gap-3 md:mt-6 md:grid-cols-2 md:gap-4'
          }
        >
          {items.map(({ course, imageAlt, index }) => (
            <MiniCourseCard
              key={course.slug}
              course={course}
              imageAlt={imageAlt}
              index={index}
              priority={index < 2}
              layout="compact"
            />
          ))}
        </div>
      </div>
    </section>
  );
}
