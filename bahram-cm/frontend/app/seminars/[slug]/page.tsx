import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { SiteImage } from '@/components/ui/SiteImage';
import { SeminarRegisterCta } from '@/components/seminars/SeminarRegisterCta';
import { getPublicSeminarBySlug } from '@/lib/services/seminars';
import { formatDateFa } from '@/lib/persian';
import { buildMetadata } from '@/lib/seo';
import { resolveMediaAlt } from '@/lib/media/alt';
import { sitePhotos } from '@/lib/site-photo-paths';

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
  const result = await getPublicSeminarBySlug(slug);
  if (!result.ok) notFound();

  const seminar = result.data;
  const heroImage = seminar.cover_image || sitePhotos.landscapeSession;
  const coverAlt = await resolveMediaAlt(heroImage, seminar.title);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip bg-ink pb-10 md:pb-14">
      <section className="campaign-course-hero relative isolate w-full overflow-hidden bg-ink">
        <div className="relative aspect-[16/9] w-full min-h-[min(62vw,16rem)] sm:min-h-[18rem] md:min-h-[22rem] lg:min-h-[min(42vw,28rem)]">
          <SiteImage
            src={heroImage}
            alt={coverAlt}
            fallbackAlt={seminar.title}
            fill
            priority
            className="object-cover object-center"
            sizes="100vw"
          />
          <div aria-hidden className="photo-scrim-bottom-half" />

          <div className="absolute inset-x-0 top-0 z-20 px-4 pt-4 sm:px-6 sm:pt-6">
            <Link
              href="/"
              className="inline-flex min-h-10 items-center gap-2 text-sm text-gold transition-colors hover:text-gold-soft sm:text-caption"
            >
              <ArrowLeft className="rtl-flip h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              بازگشت
            </Link>
          </div>

          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center overflow-visible px-4 pb-6 pt-24 sm:pb-8 sm:pt-28 md:pb-10 md:pt-32">
            <div className="campaign-course-hero-headline-outer">
              <div className="campaign-course-hero-headline-wrap">
                <h1 className="campaign-course-hero-headline">
                  <span className="campaign-course-hero-eyebrow">سمینار</span>
                  <span className="campaign-course-hero-title">{seminar.title}</span>
                </h1>
              </div>
            </div>

            {(seminar.date || seminar.location) && (
              <ul className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:mb-5 sm:gap-3">
                {seminar.date ? (
                  <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-white/20 bg-black/30 px-3.5 py-2 text-sm text-white/90 backdrop-blur-md sm:px-4">
                    <Calendar className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{formatDateFa(seminar.date)}</span>
                  </li>
                ) : null}
                {seminar.location ? (
                  <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-white/20 bg-black/30 px-3.5 py-2 text-sm text-white/90 backdrop-blur-md sm:px-4">
                    <MapPin className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{seminar.location}</span>
                  </li>
                ) : null}
              </ul>
            )}

            <SeminarRegisterCta
              variant="hero"
              productSlug={seminar.product_slug}
              isPurchasable={seminar.is_purchasable}
              isFull={seminar.is_full}
              price={seminar.price}
              salePrice={seminar.sale_price}
              effectivePrice={seminar.effective_price}
              remainingSeats={seminar.remaining_seats}
            />
          </div>
        </div>
      </section>

      <section id="seminar-about" className="relative scroll-mt-20 bg-ink py-12 sm:py-16 md:py-20 lg:py-24">
        <div className="container-luxe min-w-0 max-w-3xl">
          <Reveal>
            <h2 className="text-h3 text-bone">درباره سمینار</h2>
            {seminar.description ? (
              <article
                className="prose-luxe mt-5 text-sm leading-relaxed text-bone-dim sm:mt-6 sm:text-base"
                dangerouslySetInnerHTML={{ __html: seminar.description }}
              />
            ) : (
              <p className="mt-5 text-sm text-bone-dim sm:mt-6 sm:text-base">
                جزئیات این سمینار به‌زودی منتشر می‌شود.
              </p>
            )}
          </Reveal>
        </div>
      </section>
    </main>
  );
}
