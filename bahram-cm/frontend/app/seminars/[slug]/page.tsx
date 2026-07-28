import type { Metadata } from 'next';
import '@/lib/proseContentStyles';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Sparkles } from 'lucide-react';
import { SeminarIntroBand } from '@/components/seminars/SeminarIntroBand';
import { SeminarAboutSection } from '@/components/seminars/SeminarAboutSection';
import { SeminarRecapGallery } from '@/components/seminars/SeminarRecapGallery';
import { ContentCommentsSection } from '@/components/comments/ContentCommentsSection';
import { SitePhotoHeroFrame } from '@/components/sections/SitePhotoHeroFrame';
import { getPublicSeminarBySlug } from '@/lib/services/seminars';
import { buildMetadata } from '@/lib/seo';
import { coalesceAlt, staticAltForSrc } from '@/lib/media/altShared';
import { primarySiteImageSrc } from '@/lib/mediaUrl';
import { sitePhotos } from '@/lib/site-photo-paths';
import { formatDateFa } from '@/lib/persian';
import { buildCommentAuthorFromStudent } from '@/lib/contentComments/author';
import { getContentCommentsFromApi } from '@/lib/services/contentComments.server';
import { getCurrentStudent } from '@/lib/student/session';
import { ensureStaticPageCache } from '@/lib/cache/staticPage';

// Literal required for Next segment config static analysis (Next 16).
export const revalidate = 300;

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
  await ensureStaticPageCache();
  const { slug } = await params;
  const [result, student, commentsResult] = await Promise.all([
    getPublicSeminarBySlug(slug),
    getCurrentStudent(),
    getContentCommentsFromApi('seminar', slug),
  ]);
  if (!result.ok) notFound();

  const seminar = result.data;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const isEnded = Boolean(seminar.is_ended);
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
                  {isEnded ? (
                    <span className="mb-2 inline-flex items-center justify-center gap-1.5 self-center rounded-pill border border-gold/35 bg-ink/45 px-3.5 py-1.5 text-[0.75rem] font-medium tracking-[0.04em] text-gold backdrop-blur-md sm:mb-3 sm:px-4 sm:py-2 sm:text-sm">
                      <Sparkles className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
                      این سمینار برگزار شد
                    </span>
                  ) : (
                    <span className="campaign-course-hero-eyebrow">سمینار</span>
                  )}
                  <span className="campaign-course-hero-title">{seminar.title}</span>
                </h1>
              </div>
            </div>

            {isEnded && (seminar.date || seminar.location) ? (
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:mt-4 sm:gap-2.5">
                {seminar.date ? (
                  <li className="inline-flex min-w-0 items-center gap-1.5 rounded-pill border border-white/15 bg-ink/50 px-3 py-1.5 text-xs text-bone backdrop-blur-md sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm">
                    <Calendar className="h-3.5 w-3.5 shrink-0 text-gold sm:h-4 sm:w-4" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{formatDateFa(seminar.date)}</span>
                  </li>
                ) : null}
                {seminar.location ? (
                  <li className="inline-flex min-w-0 items-center gap-1.5 rounded-pill border border-white/15 bg-ink/50 px-3 py-1.5 text-xs text-bone backdrop-blur-md sm:gap-2 sm:px-3.5 sm:py-2 sm:text-sm">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-gold sm:h-4 sm:w-4" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{seminar.location}</span>
                  </li>
                ) : null}
              </ul>
            ) : null}
          </div>
        </SitePhotoHeroFrame>
      </section>

      {!isEnded ? <SeminarIntroBand seminar={seminar} /> : null}

      {isEnded && (seminar.gallery.length > 0 || (seminar.gallery_slider?.length ?? 0) > 0) ? (
        <SeminarRecapGallery
          items={seminar.gallery}
          sliderItems={seminar.gallery_slider ?? []}
          title={seminar.title}
        />
      ) : null}

      <SeminarAboutSection
        title={seminar.title}
        description={seminar.description}
        ended={isEnded}
      />

      <ContentCommentsSection
        type="seminar"
        slug={seminar.slug}
        initialComments={comments}
        initialAuthor={buildCommentAuthorFromStudent(student)}
      />
    </main>
  );
}
