import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PurchaseForm } from "@/components/forms/PurchaseForm";
import { CheckoutReferralCodeField } from "@/components/commerce/CheckoutReferralCodeField";
import { CheckoutDiscountCodeField } from "@/components/commerce/CheckoutDiscountCodeField";
import { CheckoutPriceSummary } from "@/components/commerce/CheckoutPriceSummary";
import { CheckoutSidebar } from "@/components/commerce/CheckoutSidebar";
import { LinkButton } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { SiteImage } from "@/components/ui/SiteImage";
import { getCurrentStudent, studentFetch } from "@/lib/student/session";
import { getProductBySlug, type ProductDetail } from "@/lib/services/products";
import { formatFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";
import { resolveProductFeaturedImage } from "@/lib/catalog/productFeaturedImage";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function purchaseProductImage(product: ProductDetail): string {
  return resolveProductFeaturedImage(product);
}

function purchaseProductImageAlt(product: ProductDetail): string {
  return product.featured_image_alt?.trim() || `کاور ${product.title}`;
}

function purchaseBackLink(product: ProductDetail): { href: string; label: string } {
  if (product.landing_href) {
    return {
      href: product.landing_href,
      label: product.seminar ? "بازگشت به سمینار" : "بازگشت",
    };
  }
  return { href: "/", label: "بازگشت" };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(slug);
  if (!result.ok) return {};
  const product = result.data;

  return buildMetadata({
    title: `خرید ${product.title}`,
    description: product.meta_description || product.short_description || product.title,
    path: `/purchase/${product.slug}`,
    image: product.featured_image ?? undefined,
    noIndex: true,
  });
}

export default async function PurchasePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [result, student] = await Promise.all([getProductBySlug(slug), getCurrentStudent()]);
  const ownReferralCode = student
    ? await studentFetch<{ data: { code: string } }>("/referrals")
        .then((res) => res.data.code)
        .catch(() => null)
    : null;
  if (!result.ok) notFound();

  const product = result.data;
  const alreadyPurchased = product.already_purchased ?? false;
  const seminarFull = product.seminar?.is_full ?? false;
  const backLink = purchaseBackLink(product);

  return (
    <main id="main-content" className="relative min-w-0 w-full max-w-full overflow-x-clip pt-8 md:pt-10 lg:pt-12">
      <section className="pb-section-sm">
        <div className="container-luxe min-w-0 max-w-full">
          <Link
            href={backLink.href}
            className="mb-5 inline-flex shrink-0 items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft md:mb-6"
          >
            <ArrowLeft className="rtl-flip h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
            {backLink.label}
          </Link>

          <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-6 md:grid-cols-12 md:items-stretch md:gap-8">
            <div className="flex h-full min-w-0 flex-col md:col-span-7 md:col-start-1">
              <Reveal className="flex min-h-0 flex-1 flex-col">
                <article className="neon-surface-static flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-bone/10 bg-charcoal/45">
                  <div className="relative aspect-[16/10] w-full min-h-[11rem] shrink-0 sm:aspect-[16/9] sm:min-h-[13rem] md:min-h-0 md:flex-1">
                    <SiteImage
                      src={purchaseProductImage(product)}
                      alt={purchaseProductImageAlt(product)}
                      fallbackAlt={product.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 42vw"
                      className="object-cover"
                    />
                  </div>

                  <div className="flex flex-col p-5 sm:p-6 md:flex-none">
                    <h2 className="text-h3 text-balance text-bone">{product.title}</h2>
                    {product.short_description ? (
                      <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-bone-dim md:text-base">
                        {product.short_description}
                      </p>
                    ) : null}
                    {product.seminar ? (
                      <p className="mt-4 text-sm text-bone-dim">
                        {seminarFull
                          ? "ظرفیت این سمینار تکمیل شده است."
                          : product.seminar.remaining_seats != null
                            ? `${formatFa(product.seminar.remaining_seats)} جای خالی باقی مانده`
                            : "ظرفیت نامحدود"}
                      </p>
                    ) : null}
                  </div>
                </article>
              </Reveal>
            </div>

            <div className="flex h-full min-w-0 flex-col md:col-span-5 md:col-start-8">
              <Reveal delay={0.08} className="flex h-full min-h-0 flex-col">
                <CheckoutSidebar>
                  <aside className="neon-surface-static flex h-full min-h-0 w-full flex-col rounded-card border border-bone/10 bg-charcoal/45 p-5 sm:p-6 md:sticky md:top-24 md:p-6">
                    <h2 className="text-h3 text-bone">خلاصه سفارش</h2>

                    <CheckoutReferralCodeField ownReferralCode={ownReferralCode} />
                    <CheckoutDiscountCodeField productId={product.id} customerPhone={student?.mobile} />

                    <CheckoutPriceSummary
                      products={[
                        {
                          slug: product.slug,
                          title: product.title,
                          price: product.price,
                          effective_price: product.effective_price,
                        },
                      ]}
                    />

                  {alreadyPurchased ? (
                    <div className="mt-auto space-y-4 pt-6">
                      <div className="rounded-tile border border-emerald/25 bg-emerald/8 px-4 py-4 text-sm text-bone">
                        شما قبلاً این محصول را خریداری کرده‌اید.
                      </div>
                      <LinkButton href="/panel" variant="primary" size="lg" withArrow className="w-full">
                        مشاهده در پنل
                      </LinkButton>
                    </div>
                  ) : seminarFull ? (
                    <div className="mt-auto rounded-tile border border-gold/30 bg-gold/8 px-4 py-4 text-sm text-gold">
                      ظرفیت سمینار تکمیل شده و امکان خرید وجود ندارد.
                    </div>
                  ) : (
                    <div className="mt-auto w-full min-w-0 pt-6">
                      <PurchaseForm product={product} student={student} />
                    </div>
                  )}
                  </aside>
                </CheckoutSidebar>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
