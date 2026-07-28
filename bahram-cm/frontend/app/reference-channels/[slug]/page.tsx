import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { Reveal } from '@/components/motion/Reveal';
import { LinkButton } from '@/components/ui/Button';
import { getCurrentStudent } from '@/lib/student/session';
import { getProductBySlug } from '@/lib/services/products';
import { buildMetadata } from '@/lib/seo';
import { formatFa } from '@/lib/persian';
import { sanitizeRichHtml } from '@/lib/sanitize';
import '@/lib/proseContentStyles';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(`reference-${slug}`);
  if (!result.ok || result.data.type !== 'reference_channel') return {};
  const product = result.data;

  return buildMetadata({
    title: product.title,
    description: product.meta_description || product.short_description || product.title,
    path: `/reference-channels/${slug}`,
    image: product.featured_image ?? undefined,
  });
}

export default async function ReferenceChannelLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, student] = await Promise.all([
    getProductBySlug(`reference-${slug}`),
    getCurrentStudent(),
  ]);

  if (!result.ok || result.data.type !== 'reference_channel') {
    notFound();
  }

  const product = result.data;
  const pricing = product.reference_pricing;
  const listPrice = pricing?.amount ?? product.price;
  const finalPrice = pricing?.final_amount ?? product.effective_price;
  const seminarOff = pricing?.seminar_off ?? finalPrice < listPrice;
  const purchaseHref = `/purchase/${product.slug}`;
  const alreadyPurchased = product.already_purchased ?? false;

  return (
    <main id="main-content" className="relative min-w-0 w-full max-w-full overflow-x-clip pt-8 md:pt-10 lg:pt-12">
      <section className="pb-section-sm">
        <div className="container-luxe min-w-0 max-w-full">
          <Link
            href={student ? '/panel/reference-channel' : '/'}
            className="mb-5 inline-flex shrink-0 items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft md:mb-6"
          >
            <ArrowLeft className="rtl-flip h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            {student ? 'بازگشت به پنل' : 'بازگشت'}
          </Link>

          <Reveal>
            <article className="neon-surface-static mx-auto max-w-3xl rounded-card border border-bone/10 bg-charcoal/45 p-6 sm:p-8">
              <p className="text-caption text-gold">محصول آکادمی</p>
              <h1 className="mt-2 text-h2 text-balance text-bone">{product.title}</h1>
              {product.short_description ? (
                <p className="mt-3 text-sm leading-relaxed text-bone-dim md:text-base">
                  {product.short_description}
                </p>
              ) : null}

              <div className="mt-6 flex flex-wrap items-end gap-3">
                {seminarOff ? (
                  <>
                    <span className="text-sm text-bone-mute line-through">{formatFa(listPrice)} تومان</span>
                    <span className="text-h3 text-bone">{formatFa(finalPrice)} تومان</span>
                    <span className="rounded-full border border-emerald/30 bg-emerald/10 px-3 py-1 text-caption text-emerald">
                      ویژه شرکت‌کنندگان سمینار
                    </span>
                  </>
                ) : (
                  <span className="text-h3 text-bone">{formatFa(finalPrice)} تومان</span>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {alreadyPurchased ? (
                  <LinkButton href="/panel/reference-channel" variant="primary" size="lg" withArrow>
                    مشاهده در پنل
                  </LinkButton>
                ) : (
                  <LinkButton href={purchaseHref} variant="primary" size="lg" withArrow>
                    <ShoppingCart className="h-4 w-4" aria-hidden />
                    خرید کانال مرجع
                  </LinkButton>
                )}
                {student ? (
                  <LinkButton href="/panel/reference-channel" variant="ghost" size="lg">
                    پنل دانشجو
                  </LinkButton>
                ) : null}
              </div>

              {product.description?.trim() ? (
                <div
                  className="prose-luxe mt-10 max-w-none border-t border-bone/10 pt-8 text-bone-dim"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(product.description) }}
                />
              ) : null}
            </article>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
