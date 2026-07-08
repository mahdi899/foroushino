import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BadgePercent } from "lucide-react";
import { PurchaseForm } from "@/components/forms/PurchaseForm";
import { CheckoutReferralCodeField } from "@/components/commerce/CheckoutReferralCodeField";
import { PageHero } from "@/components/blocks/PageHero";
import { Reveal } from "@/components/motion/Reveal";
import { SiteImage } from "@/components/ui/SiteImage";
import { productNeedsExtraForm } from "@/lib/checkout/productFields";
import { getCurrentStudent, studentFetch } from "@/lib/student/session";
import { getProductBySlug } from "@/lib/services/products";
import { formatFa } from "@/lib/persian";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const hasDiscount = product.sale_price !== null && product.effective_price < product.price;
  const isLoggedIn = Boolean(student);
  const needsExtra = productNeedsExtraForm(product);

  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      <PageHero backLink={{ href: "/", label: "بازگشت" }} title="تکمیل خرید" />

      <section className="py-section-sm">
        <div className="container-luxe">
          <div className="grid gap-8 md:grid-cols-12 md:gap-10">
            <div className="md:col-span-5">
              <Reveal>
                <div className="neon-surface-static overflow-hidden rounded-card border border-bone/10 bg-charcoal/45">
                  {product.featured_image ? (
                    <div className="relative aspect-[3/2]">
                      <SiteImage
                        src={product.featured_image}
                        alt={product.featured_image_alt}
                        fallbackAlt={product.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 40vw"
                        className="object-cover"
                      />
                    </div>
                  ) : null}
                  <div className="p-6 md:p-8">
                    <h2 className="text-h3 text-balance text-bone">{product.title}</h2>
                    {product.short_description ? (
                      <p className="mt-3 text-bone-dim">{product.short_description}</p>
                    ) : null}
                    <div className="mt-6 flex items-baseline gap-3">
                      <span className="text-h2 text-bone num-latin">
                        {formatFa(product.effective_price)}
                      </span>
                      <span className="text-caption text-mist">تومان</span>
                      {hasDiscount ? (
                        <span className="text-caption text-mist line-through">
                          {formatFa(product.price)}
                        </span>
                      ) : null}
                    </div>
                    {hasDiscount ? (
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-pill border border-gold/30 bg-gold/8 px-3 py-1 text-caption text-gold">
                        <BadgePercent className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                        قیمت ویژه
                      </div>
                    ) : null}
                  </div>
                </div>
              </Reveal>
            </div>

            <div className="md:col-span-7">
              <Reveal delay={0.08}>
                <div className="neon-surface-static rounded-card border border-bone/10 bg-charcoal/45 p-6 md:p-8">
                  <h2 className="text-h3 text-balance text-bone">
                    {isLoggedIn ? "پرداخت" : "شروع پرداخت"}
                  </h2>
                  <p className="mt-2 text-bone-dim">
                    {isLoggedIn
                      ? needsExtra
                        ? "در صورت نیاز فیلدهای تکمیلی را بررسی کن و به درگاه برو."
                        : "با یک کلیک به درگاه پرداخت امن زرین‌پل منتقل می‌شوی."
                      : "ابتدا با کد تأیید وارد می‌شوی، سپس به درگاه پرداخت منتقل می‌شوی."}
                  </p>
                  <CheckoutReferralCodeField ownReferralCode={ownReferralCode} />
                  <div className="mt-6">
                    <PurchaseForm product={product} student={student} />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
