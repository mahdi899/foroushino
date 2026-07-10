import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { unstable_noStore } from 'next/cache';
import { MiniCourseComments } from '@/components/mini-courses/MiniCourseComments';
import { MiniCourseDetailHero } from '@/components/mini-courses/MiniCourseDetailHero';
import {
  getMiniCourseBySlugFromApi,
  getMiniCourseCommentsFromApi,
} from '@/lib/services/miniCourses.server';
import { resolveMediaAlt } from '@/lib/media/alt';
import { buildMetadata } from '@/lib/seo';
import { getCurrentStudent, studentFetch } from '@/lib/student/session';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamic = 'force-dynamic';

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
  unstable_noStore();
  const { slug } = await params;
  const [courseResult, commentsResult] = await Promise.all([
    getMiniCourseBySlugFromApi(slug),
    getMiniCourseCommentsFromApi(slug),
  ]);

  if (!courseResult.ok || !courseResult.data) notFound();

  const course = courseResult.data;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const imageAlt = course.thumbnail
    ? await resolveMediaAlt(course.thumbnail, course.title)
    : course.title;

  const student = await getCurrentStudent();
  let isEnrolled = false;
  let enrollmentNumber: string | null = null;

  if (student) {
    try {
      const status = await studentFetch<{
        data: { enrolled: boolean; order_number?: string | null; enrollment_number?: string | null };
      }>(`/mini-courses/${encodeURIComponent(slug)}`);
      isEnrolled = status.data.enrolled;
      enrollmentNumber = status.data.order_number ?? status.data.enrollment_number ?? null;
    } catch {
      isEnrolled = false;
    }
  }

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <section className="border-b border-bone/8 pb-section-sm">
        <MiniCourseDetailHero
          course={course}
          imageAlt={imageAlt}
          descriptionHtml={course.description}
          isEnrolled={isEnrolled}
          enrollmentNumber={enrollmentNumber}
        />
      </section>

      <MiniCourseComments
        slug={course.slug}
        enabled={course.comments_enabled}
        initialComments={comments}
      />
    </main>
  );
}
