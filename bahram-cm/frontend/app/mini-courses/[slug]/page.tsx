import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ArticleVideoEmbed } from '@/components/blog/ArticleVideoEmbed';
import { MiniCourseComments } from '@/components/mini-courses/MiniCourseComments';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
import { LinkButton } from '@/components/ui/Button';
import {
  getMiniCourseBySlugFromApi,
  getMiniCourseCommentsFromApi,
} from '@/lib/services/miniCourses';
import { resolveMediaAlt } from '@/lib/media/alt';
import { buildMetadata } from '@/lib/seo';

type PageProps = { params: Promise<{ slug: string }> };

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

          <Reveal delay={0.1}>
            <div className="mt-8 overflow-hidden rounded-card border border-bone/10 bg-charcoal/35">
              <ArticleVideoEmbed aparat={course.aparat_hash} eager />
            </div>
          </Reveal>

          {course.thumbnail ? (
            <Reveal delay={0.12} className="mt-6 hidden">
              <SiteImage
                src={course.thumbnail}
                alt={imageAlt}
                width={1200}
                height={675}
                className="rounded-card"
              />
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

          <Reveal delay={0.18}>
            <div className="mt-10 flex flex-wrap gap-4">
              <LinkButton href="/course/campaign-writing" variant="primary" withArrow>
                ورود به دوره اصلی
              </LinkButton>
              <LinkButton href="/courses" variant="ghost">
                همه دوره‌ها
              </LinkButton>
            </div>
          </Reveal>
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
