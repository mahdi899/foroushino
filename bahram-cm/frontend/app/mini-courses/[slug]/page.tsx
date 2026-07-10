import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { MiniCourseComments } from '@/components/mini-courses/MiniCourseComments';
import { MiniCourseEnrollCta } from '@/components/mini-courses/MiniCourseEnrollCta';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
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
        data: { enrolled: boolean; enrollment_number?: string | null };
      }>(`/mini-courses/${encodeURIComponent(slug)}`);
      isEnrolled = status.data.enrolled;
      enrollmentNumber = status.data.enrollment_number ?? null;
    } catch {
      isEnrolled = false;
    }
  }

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <section className="border-b border-bone/8 py-section-sm">
        <div className="container-luxe max-w-4xl">
          <Reveal>
            <Link
              href="/courses#mini-courses"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
              بازگشت به دوره‌ها
            </Link>
          </Reveal>

          <Reveal delay={0.06}>
            <h1 className="mt-6 text-h1 text-balance text-bone">{course.title}</h1>
            {course.subtitle ? <p className="mt-4 text-lg text-bone-dim">{course.subtitle}</p> : null}
            {course.summary ? <p className="mt-3 text-bone-dim">{course.summary}</p> : null}
          </Reveal>

          <Reveal delay={0.08}>
            <div className="mt-8 rounded-card-lg border border-emerald-glow/25 bg-gradient-to-br from-charcoal/80 via-charcoal/60 to-emerald-glow/5 p-5 md:p-6">
              <MiniCourseEnrollCta
                slug={course.slug}
                isLoggedIn={Boolean(student)}
                isEnrolled={isEnrolled}
                enrollmentNumber={enrollmentNumber}
              />
            </div>
          </Reveal>

          {course.thumbnail ? (
            <Reveal delay={0.1}>
              <div className="mt-8 overflow-hidden rounded-card border border-bone/10 bg-charcoal/35">
                <SiteImage
                  src={course.thumbnail}
                  alt={imageAlt}
                  width={1200}
                  height={675}
                  className="h-auto w-full object-cover"
                />
              </div>
            </Reveal>
          ) : null}

          {course.description ? (
            <Reveal delay={0.14}>
              <article
                className="prose-luxe mt-8 text-bone-dim"
                dangerouslySetInnerHTML={{ __html: course.description }}
              />
            </Reveal>
          ) : null}
        </div>
      </section>

      <MiniCourseComments
        slug={course.slug}
        enabled={course.comments_enabled}
        initialComments={comments}
      />
    </main>
  );
}
