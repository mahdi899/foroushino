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
import { getCurrentStudent } from '@/lib/student/session';
import { resolveMediaAlt } from '@/lib/media/alt';

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
  const [result, student] = await Promise.all([getPublicSeminarBySlug(slug), getCurrentStudent()]);
  if (!result.ok) notFound();

  const seminar = result.data;
  const coverAlt = seminar.cover_image
    ? await resolveMediaAlt(seminar.cover_image, seminar.title)
    : seminar.title;

  const descriptionBlock = (
    <Reveal delay={seminar.cover_image ? 0.08 : 0}>
      <div className="rounded-card border border-bone/8 bg-charcoal/25 p-4 sm:rounded-card-lg sm:p-6 md:p-8">
        <h2 className="text-lg font-semibold text-bone sm:text-h3">درباره سمینار</h2>
        {seminar.description ? (
          <article
            className="prose-luxe mt-4 text-sm leading-relaxed text-bone-dim sm:mt-5 sm:text-base"
            dangerouslySetInnerHTML={{ __html: seminar.description }}
          />
        ) : (
          <p className="mt-4 text-sm text-bone-dim sm:mt-5 sm:text-base">
            جزئیات این سمینار به‌زودی منتشر می‌شود.
          </p>
        )}
      </div>
    </Reveal>
  );

  return (
    <main id="main-content" className="relative min-w-0 max-w-full bg-ink pb-6 sm:pb-8 lg:pb-0">
      <section className="border-b border-bone/8 bg-ink">
        <div className="container-luxe py-6 text-center sm:py-8 sm:text-start md:py-10">
          <Reveal>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center justify-center gap-2 text-sm text-gold transition-colors hover:text-gold-soft sm:justify-start sm:text-caption"
            >
              <ArrowLeft className="rtl-flip h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />
              بازگشت
            </Link>
          </Reveal>
          <Reveal delay={0.06}>
            <div className="mx-auto mt-4 max-w-3xl sm:mt-5">
              <p className="text-sm font-medium tracking-wide text-emerald-glow sm:text-caption">
                سمینار
              </p>
              <h1 className="mt-2 text-balance text-2xl font-semibold leading-snug text-bone sm:text-h2 md:text-h1">
                {seminar.title}
              </h1>
            </div>
          </Reveal>
          {(seminar.date || seminar.location) && (
            <Reveal delay={0.12}>
              <ul className="mx-auto mt-4 flex max-w-3xl flex-col items-center gap-2.5 sm:mt-5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-start sm:gap-3">
                {seminar.date ? (
                  <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-bone/10 bg-charcoal/50 px-3.5 py-2.5 text-sm text-bone-dim sm:px-4">
                    <Calendar className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{formatDateFa(seminar.date)}</span>
                  </li>
                ) : null}
                {seminar.location ? (
                  <li className="inline-flex min-w-0 items-center gap-2 rounded-pill border border-bone/10 bg-charcoal/50 px-3.5 py-2.5 text-sm text-bone-dim sm:px-4">
                    <MapPin className="h-4 w-4 shrink-0 text-gold" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0">{seminar.location}</span>
                  </li>
                ) : null}
              </ul>
            </Reveal>
          )}
        </div>
      </section>

      <section className="py-6 sm:py-8 md:py-section-sm">
        <div className="container-luxe grid min-w-0 gap-5 sm:gap-6 lg:grid-cols-12 lg:gap-10">
          {seminar.cover_image ? (
            <div className="order-1 min-w-0 lg:col-span-7 lg:row-start-1 xl:col-span-8">
              <Reveal>
                <figure className="neon-surface-static overflow-hidden rounded-card border border-bone/10 bg-charcoal/35 sm:rounded-card-lg">
                  <div className="relative aspect-[16/10] w-full bg-charcoal/60 sm:aspect-[16/9]">
                    <SiteImage
                      src={seminar.cover_image}
                      alt={coverAlt}
                      fallbackAlt={seminar.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 100vw, 66vw"
                      className="object-cover object-center"
                      priority
                    />
                  </div>
                  <figcaption className="hidden border-t border-bone/8 px-4 py-3 text-caption text-mist sm:block">
                    {seminar.title}
                  </figcaption>
                </figure>
              </Reveal>
            </div>
          ) : null}

          <div
            className={
              seminar.cover_image
                ? 'order-3 min-w-0 lg:col-span-7 lg:row-start-2 xl:col-span-8'
                : 'order-3 min-w-0 lg:col-span-7 lg:row-start-1 xl:col-span-8'
            }
          >
            {descriptionBlock}
          </div>

          <div className="order-2 min-w-0 lg:col-span-5 lg:row-span-2 lg:row-start-1 xl:col-span-4">
            <SeminarRegisterCta
              productSlug={seminar.product_slug}
              isPurchasable={seminar.is_purchasable}
              isFull={seminar.is_full}
              isLoggedIn={Boolean(student)}
              price={seminar.price}
              salePrice={seminar.sale_price}
              effectivePrice={seminar.effective_price}
              remainingSeats={seminar.remaining_seats}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
