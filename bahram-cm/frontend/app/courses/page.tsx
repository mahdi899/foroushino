import type { Metadata } from 'next';
import { CourseCatalogGrid } from '@/components/sections/CourseCatalogGrid';
import { SocialProofStats } from '@/components/sections/SocialProofStats';
import { getCourseCatalogCards } from '@/lib/catalog/courseListings';
import { buildMetadata } from '@/lib/seo';
import { resolveMediaAlt } from '@/lib/media/alt';

export const metadata: Metadata = buildMetadata({
  title: 'دوره‌ها',
  description: 'دو مسیر اصلی آکادمی؛ کمپین‌نویسی و سات — هر کدام با خروجی مشخص.',
  path: '/courses',
});

export default async function CoursesPage() {
  const courses = await getCourseCatalogCards();
  const courseCards = await Promise.all(
    courses.map(async (course) => ({
      ...course,
      imageAlt: course.imageAlt || (await resolveMediaAlt(course.image, `کاور ${course.label}`)),
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
    </main>
  );
}
