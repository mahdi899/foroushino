import type { Metadata } from 'next';
import { CourseCatalogGrid } from '@/components/sections/CourseCatalogGrid';
import { MiniCourseCard } from '@/components/mini-courses/MiniCourseCard';
import { SocialProofStats } from '@/components/sections/SocialProofStats';
import { Reveal } from '@/components/motion/Reveal';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { getCourseCatalogCards } from '@/lib/catalog/courseListings';
import { getMiniCoursesFromApi } from '@/lib/services/miniCourses';
import { buildMetadata } from '@/lib/seo';
import { resolveMediaAlt } from '@/lib/media/alt';

export const metadata: Metadata = buildMetadata({
  title: 'دوره‌ها',
  description: 'دو مسیر اصلی آکادمی؛ کمپین‌نویسی و سات — هر کدام با خروجی مشخص. مینی‌دوره‌های رایگان برای شروع سریع.',
  path: '/courses',
});

export default async function CoursesPage() {
  const [courses, miniCoursesResult] = await Promise.all([
    getCourseCatalogCards(),
    getMiniCoursesFromApi(),
  ]);

  const courseCards = await Promise.all(
    courses.map(async (course) => ({
      ...course,
      imageAlt: course.imageAlt || (await resolveMediaAlt(course.image, `کاور ${course.label}`)),
    })),
  );

  const miniCourses = miniCoursesResult.ok ? miniCoursesResult.data : [];
  const miniCourseCards = await Promise.all(
    miniCourses.map(async (course, i) => ({
      course,
      imageAlt: course.thumbnail
        ? await resolveMediaAlt(course.thumbnail, course.title)
        : course.title,
      index: i,
    })),
  );

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <section className="courses-catalog main-paths-section relative isolate overflow-x-clip pt-8 pb-section-sm md:pt-10 md:pb-section lg:pt-12">
        <div
          aria-hidden
          className="main-paths-section-ambient pointer-events-none absolute inset-0"
        />
        <div className="container-luxe relative">
          <CourseCatalogGrid courses={courseCards} />
        </div>
        <SocialProofStats
          as="div"
          className="relative mt-10 py-2 md:mt-12 md:py-4 lg:mt-14"
        />
      </section>

      {miniCourseCards.length > 0 ? (
        <section id="mini-courses" className="border-t border-bone/8 py-section-sm">
          <div className="container-luxe">
            <Reveal>
              <Eyebrow>Mini Courses</Eyebrow>
              <h2 className="mt-4 text-h2 text-balance text-bone">مینی‌دوره‌ها</h2>
              <p className="mt-4 max-w-2xl text-bone-dim">
                ویدیوهای رایگان برای ورود سریع به تفکر کمپین‌محور — قبل از مسیر اصلی.
              </p>
            </Reveal>

            <div className="mt-8 grid gap-5 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {miniCourseCards.map(({ course, imageAlt, index }) => (
                <MiniCourseCard
                  key={course.slug}
                  course={course}
                  imageAlt={imageAlt}
                  index={index}
                  priority={index < 3}
                />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
