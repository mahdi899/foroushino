import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SeminarIntroBand } from '@/components/seminars/SeminarIntroBand';
import { ContentCommentsSection } from '@/components/comments/ContentCommentsSection';
import { Reveal } from '@/components/motion/Reveal';
import { SitePhotoHeroFrame } from '@/components/sections/SitePhotoHeroFrame';
import { getPublicSeminarBySlug } from '@/lib/services/seminars';
import { buildMetadata } from '@/lib/seo';
import { coalesceAlt, staticAltForSrc } from '@/lib/media/altShared';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { sitePhotos } from '@/lib/site-photo-paths';
import { sanitizeRichHtml } from '@/lib/sanitize';
import { buildCommentAuthorFromStudent } from '@/lib/contentComments/author';
import { getContentCommentsFromApi } from '@/lib/services/contentComments.server';
import { getCurrentStudent } from '@/lib/student/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicSeminarBySlug(slug);
  if (!result.ok) return {};
  const seminar = result.data;

  return buildMetadata({
    title: seminar.title,
    description: seminar.description?.replace(/<[^>]+>/g, ' ').slice(0, 160) || seminar.title,
    path: `/seminars/${seminar.slug}`,
    image: seminar.cover_image ?? undefined,
  });
}

export default async function PublicSeminarPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, student, commentsResult] = await Promise.all([
    getPublicSeminarBySlug(slug),
    getCurrentStudent(),
    getContentCommentsFromApi('seminar', slug),
  ]);
  if (!result.ok) notFound();

  const seminar = result.data;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const heroDesktop = seminar.cover_image || sitePhotos.landscapeSession;
  const heroMobile = seminar.cover_image_mobile || seminar.cover_image || sitePhotos.landscapeSession;
  const heroDesktopAlt = coalesceAlt(staticAltForSrc(heroDesktop), seminar.title, heroDesktop);
  const heroMobileAlt = coalesceAlt(staticAltForSrc(heroMobile), seminar.title, heroMobile);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip bg-ink pb-10 md:pb-14">
      <link
        rel="preload"
        as="image"
        href={primarySiteImageSrc(heroMobile)}
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={primarySiteImageSrc(heroDesktop)}
        media="(min-width: 768px)"
        fetchPriority="high"
      />

      <section className="campaign-course-hero relative isolate w-full overflow-hidden bg-ink">
        <SitePhotoHeroFrame
          desktopSrc={heroDesktop}
          mobileSrc={heroMobile}
          desktopAlt={heroDesktopAlt}
          mobileAlt={heroMobileAlt}
        >
          <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 sm:pt-6">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 text-sm text-gold transition-colors hover:text-gold-soft sm:text-caption"
            >
              <ArrowLeft className="rtl-flip h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              بازگشت
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center overflow-visible px-4 pb-3 pt-10 sm:pb-4 sm:pt-12 md:bottom-0 md:pb-6 md:pt-14">
            <div className="campaign-course-hero-headline-outer">
              <div className="campaign-course-hero-headline-wrap">
                <h1 className="campaign-course-hero-headline">
                  <span className="campaign-course-hero-eyebrow">سمینار</span>
                  <span className="campaign-course-hero-title">{seminar.title}</span>
                </h1>
              </div>
            </div>
          </div>
        </SitePhotoHeroFrame>
      </section>

      <SeminarIntroBand seminar={seminar} />

      <section id="seminar-about" className="relative scroll-mt-20 bg-ink py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="container-luxe min-w-0 max-w-3xl">
          <Reveal>
            <h2 className="text-h3 text-bone">درباره سمینار</h2>
            {seminar.description ? (
              <article
                className="prose-luxe mt-5 text-sm leading-relaxed text-bone-dim sm:mt-6 sm:text-base"
                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(seminar.description) }}
              />
            ) : (
              <p className="mt-5 text-sm text-bone-dim sm:mt-6 sm:text-base">
                جزئیات این سمینار به‌زودی منتشر می‌شود.
              </p>
            )}
          </Reveal>
        </div>
      </section>

      <ContentCommentsSection
        type="seminar"
        slug={seminar.slug}
        initialComments={comments}
        initialAuthor={buildCommentAuthorFromStudent(student)}
      />
    </main>
  );
}
