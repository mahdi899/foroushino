import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ContentCommentsSection } from '@/components/comments/ContentCommentsSection';
import { MiniCourseDetailHero } from '@/components/mini-courses/MiniCourseDetailHero';
import {
  getMiniCourseBySlugFromApi,
} from '@/lib/services/miniCourses.server';
import { getContentCommentsFromApi } from '@/lib/services/contentComments.server';
import { resolveMediaAlt } from '@/lib/media/alt';
import { buildMetadata } from '@/lib/seo';
import { ensureStaticPageCache } from '@/lib/cache/staticPage';

type PageProps = {
  params: Promise<{ slug: string }>;
};

// Literal required for Next segment config static analysis (Next 16).
export const revalidate = 300;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getMiniCourseBySlugFromApi(slug);
  if (!result.ok || !result.data) return {};

  const course = result.data;
  return buildMetadata({
    title: course.meta_title || course.title,
    description:
      course.meta_description ||
      course.summary ||
      course.subtitle ||
      course.title,
    path: `/mini-courses/${course.slug}`,
    image: course.thumbnail ?? undefined,
  });
}

export default async function MiniCourseDetailPage({ params }: PageProps) {
  await ensureStaticPageCache();
  const { slug } = await params;
  const [courseResult, commentsResult] = await Promise.all([
    getMiniCourseBySlugFromApi(slug),
    getContentCommentsFromApi('mini_course', slug),
  ]);

  if (!courseResult.ok || !courseResult.data) notFound();

  const course = courseResult.data;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const imageAlt = course.thumbnail
    ? await resolveMediaAlt(course.thumbnail, course.title)
    : course.title;
  const mobileImageAlt = course.thumbnail_mobile
    ? await resolveMediaAlt(course.thumbnail_mobile, course.title)
    : imageAlt;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <section className="border-b border-bone/8 pb-section-sm">
        <MiniCourseDetailHero
          course={course}
          imageAlt={imageAlt}
          mobileImageAlt={mobileImageAlt}
          descriptionHtml={course.description}
          isEnrolled={false}
          enrollmentNumber={null}
        />
      </section>

      <ContentCommentsSection
        type="mini_course"
        slug={course.slug}
        enabled={course.comments_enabled}
        initialComments={comments}
      />
    </main>
  );
}
