import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartAddFromQuery } from "@/components/commerce/CartAddFromQuery";
import { CartPayButton, CartRemoveButton } from "@/components/commerce/CartItemActions";
import { CheckoutReferralCodeField } from "@/components/commerce/CheckoutReferralCodeField";
import { PurchaseForm } from "@/components/forms/PurchaseForm";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { getServerCartSlugs } from "@/lib/cart/server";
import { formatFa } from "@/lib/persian";
import { getProductBySlug, type ProductDetail } from "@/lib/services/products";
import { getCurrentStudent, studentFetch } from "@/lib/student/session";
import { buildMetadata } from "@/lib/seo";
import { sitePhotos } from "@/lib/site-photo-paths";

const cartImageFallback: Record<string, string> = {
  "campaign-writing": sitePhotos.mainPathCampaign,
  saat: sitePhotos.mainPathSaat,
};

function cartProductImage(product: ProductDetail): string {
  return product.featured_image || cartImageFallback[product.slug] || sitePhotos.landscapeSession;
}

function cartProductImageAlt(product: ProductDetail): string {
  return product.featured_image_alt?.trim() || `کاور ${product.title}`;
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = buildMetadata({
  title: "سبد خرید",
  description: "مرور محصولات انتخاب‌شده و ادامه فرایند خرید دوره.",
  path: "/cart",
  noIndex: true,
});

async function loadCartProducts(slugs: string[]): Promise<ProductDetail[]> {
  const products: ProductDetail[] = [];

  for (const slug of slugs) {
    const result = await getProductBySlug(slug);
    if (result.ok) products.push(result.data);
  }

  return products;
}

function productHasDiscount(product: ProductDetail): boolean {
  return product.sale_price !== null && product.effective_price < product.price;
}

function CartProductCard({ product, className }: { product: ProductDetail; className?: string }) {
  return (
    <article
      className={cn(
        "neon-surface-static flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-bone/10 bg-charcoal/45",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full min-h-[11rem] shrink-0 sm:aspect-[16/9] sm:min-h-[13rem] md:min-h-0 md:flex-1">
        <SiteImage
          src={cartProductImage(product)}
          alt={cartProductImageAlt(product)}
          fallbackAlt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 42vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col p-5 sm:p-6 md:flex-none">
        <div className="flex w-full min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-h3 text-balance text-bone">{product.title}</h2>
            {product.short_description ? (
              <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-bone-dim md:text-base">
                {product.short_description}
              </p>
            ) : null}
          </div>
          <CartRemoveButton slug={product.slug} />
        </div>
      </div>
    </article>
  );
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ add?: string }>;
}) {
  const { add } = await searchParams;
  const [cookieSlugs, student] = await Promise.all([getServerCartSlugs(), getCurrentStudent()]);
  const ownReferralCode = student
    ? await studentFetch<{ data: { code: string } }>("/referrals")
        .then((res) => res.data.code)
        .catch(() => null)
    : null;
  const slugs = [...new Set([...cookieSlugs, ...(add ? [add] : [])])];
  const loadedProducts = await loadCartProducts(slugs);
  const products = loadedProducts.filter((product) => !product.already_purchased);
  const ownedProducts = loadedProducts.filter((product) => product.already_purchased);
  const total = products.reduce((sum, product) => sum + product.effective_price, 0);
  const originalTotal = products.reduce((sum, product) => sum + product.price, 0);
  const totalDiscount = Math.max(0, originalTotal - total);
  const backHref = products[0]?.landing_href ?? "/course/campaign-writing";
  const backLabel = products.length === 1 && products[0]?.landing_href ? "بازگشت به دوره" : "بازگشت";

  return (
    <main id="main-content" className="relative min-w-0 w-full max-w-full overflow-x-clip pt-8 md:pt-10 lg:pt-12">
      {add ? <CartAddFromQuery slug={add} /> : null}

      <section className="pb-section-sm">
        <div className="container-luxe min-w-0 max-w-full">
          {products.length === 0 ? (
            <Reveal className="w-full min-w-0">
              <div className="neon-surface-static mx-auto w-full max-w-xl rounded-card border border-bone/10 bg-charcoal/45 p-8 text-center md:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-bone/12 bg-ink/50 text-emerald-glow">
                  <ShoppingBag className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </div>
                <h2 className="mt-5 text-h3 text-bone">
                  {ownedProducts.length > 0 ? "این محصول را قبلاً خریده‌اید" : "سبد خرید شما خالی است"}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-bone-dim">
                  {ownedProducts.length > 0
                    ? "دسترسی شما فعال است. می‌توانی از پنل کاربری ادامه بدهی."
                    : "برای شروع خرید، از صفحه دوره محصول موردنظر را به سبد اضافه کن."}
                </p>
                <div className="mt-8 flex justify-center">
                  <LinkButton
                    href={ownedProducts.length > 0 ? "/panel" : "/course/campaign-writing"}
                    variant="primary"
                    size="lg"
                    withArrow
                  >
                    {ownedProducts.length > 0 ? "ورود به پنل" : "مشاهده دوره کمپین‌نویسی"}
                  </LinkButton>
                </div>
              </div>
            </Reveal>
          ) : (
            <>
              <Link
                href={backHref}
                className="mx-auto mb-5 flex w-full min-w-0 max-w-5xl shrink-0 items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft md:mb-6"
              >
                <ArrowLeft className="rtl-flip h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                {backLabel}
              </Link>

              <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-6 md:grid-cols-12 md:items-stretch md:gap-8">
                <div className="flex h-full min-w-0 flex-col md:col-span-7 md:col-start-1">
                  <div className="flex min-h-0 flex-1 flex-col gap-4">
                    {products.map((product) => (
                      <CartProductCard key={product.slug} product={product} className="min-h-0 w-full" />
                    ))}
                  </div>
                </div>

                <div className="flex h-full min-w-0 flex-col md:col-span-5 md:col-start-8">
                  <aside className="neon-surface-static flex h-full min-h-0 w-full flex-col rounded-card border border-bone/10 bg-charcoal/45 p-5 sm:p-6 md:sticky md:top-24 md:p-6">
                    <h2 className="text-h3 text-bone">خلاصه سفارش</h2>

                    <CheckoutReferralCodeField ownReferralCode={ownReferralCode} />

                  <ul className="mt-5 space-y-3 border-b border-bone/10 pb-5">
                    {products.map((product) => {
                      const discounted = productHasDiscount(product);
                      return (
                        <li
                          key={product.slug}
                          className="flex w-full min-w-0 items-start justify-between gap-4 text-sm"
                        >
                          <span className="min-w-0 flex-1 leading-relaxed text-bone-dim">{product.title}</span>
                          <span className="shrink-0 text-end whitespace-nowrap">
                            <span className="block text-bone num-latin">{formatFa(product.effective_price)}</span>
                            {discounted ? (
                              <span className="mt-0.5 block text-caption text-mist line-through num-latin">
                                {formatFa(product.price)}
                              </span>
                            ) : null}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {totalDiscount > 0 ? (
                    <div className="mt-5 space-y-2 border-b border-bone/10 pb-5 text-sm">
                      <div className="flex items-center justify-between gap-4 text-bone-dim">
                        <span>قیمت اصلی</span>
                        <span className="num-latin line-through">{formatFa(originalTotal)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-gold">
                        <span>تخفیف</span>
                        <span className="num-latin">−{formatFa(totalDiscount)}</span>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-5 flex w-full min-w-0 items-center justify-between gap-4">
                    <span className="shrink-0 text-bone">جمع کل</span>
                    <div className="text-end">
                      <span className="text-h2 text-bone num-latin">{formatFa(total)}</span>
                      <span className="ms-2 text-caption text-mist">تومان</span>
                    </div>
                  </div>

                    <div className="mt-auto w-full min-w-0 pt-6">
                      {products.length === 1 ? (
                        <PurchaseForm product={products[0]!} student={student} />
                      ) : (
                        <div className="space-y-3">
                          {products.map((product) => (
                            <CartPayButton key={product.slug} product={product} student={student} />
                          ))}
                        </div>
                      )}
                    </div>
                  </aside>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
