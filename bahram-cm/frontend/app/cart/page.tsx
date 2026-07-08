import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import { CartAddFromQuery } from "@/components/commerce/CartAddFromQuery";
import { CartCheckoutButton, CartRemoveButton } from "@/components/commerce/CartItemActions";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { getServerCartSlugs } from "@/lib/cart/server";
import { formatFa } from "@/lib/persian";
import { getProductBySlug, type ProductDetail } from "@/lib/services/products";
import { buildMetadata } from "@/lib/seo";

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

function CartProductCard({ product }: { product: ProductDetail }) {
  const hasDiscount = product.sale_price !== null && product.effective_price < product.price;

  return (
    <article className="neon-surface-static w-full min-w-0 overflow-hidden rounded-card border border-bone/10 bg-charcoal/45">
      {product.featured_image ? (
        <div className="relative aspect-[16/9] w-full min-w-0 sm:aspect-[21/9]">
          <SiteImage
            src={product.featured_image}
            alt={product.featured_image_alt}
            fallbackAlt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, 60vw"
            className="object-cover"
          />
        </div>
      ) : null}

      <div className="w-full min-w-0 p-5 sm:p-6 md:p-8">
        <div className="flex w-full min-w-0 items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-h3 text-balance text-bone">{product.title}</h2>
            {product.short_description ? (
              <p className="mt-3 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-bone-dim md:text-base">
                {product.short_description}
              </p>
            ) : null}
          </div>
          <CartRemoveButton slug={product.slug} />
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-3">
          <span className="text-h2 text-bone num-latin">{formatFa(product.effective_price)}</span>
          <span className="text-caption text-mist">تومان</span>
          {hasDiscount ? (
            <span className="text-caption text-mist line-through">{formatFa(product.price)}</span>
          ) : null}
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
  const cookieSlugs = await getServerCartSlugs();
  const slugs = [...new Set([...cookieSlugs, ...(add ? [add] : [])])];
  const products = await loadCartProducts(slugs);
  const total = products.reduce((sum, product) => sum + product.effective_price, 0);

  return (
    <main id="main-content" className="relative min-w-0 w-full max-w-full overflow-x-clip">
      {add ? <CartAddFromQuery slug={add} /> : null}

      <section className="relative overflow-x-clip bg-ink wash-emerald py-section-sm md:py-section">
        <div className="container-luxe relative z-[2] min-w-0 max-w-full">
          <Reveal>
            <Link
              href="/course/campaign-writing"
              className="inline-flex items-center gap-2 text-caption text-gold transition-colors hover:text-gold-soft"
            >
              <ArrowLeft className="rtl-flip h-3.5 w-3.5" aria-hidden />
              بازگشت به دوره
            </Link>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="mt-5 max-w-3xl text-h1 text-balance md:mt-6">سبد خرید</h1>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 max-w-2xl text-bone-dim">
              محصولات انتخاب‌شده را مرور کن و برای تکمیل خرید به مرحله بعد برو.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="container-luxe min-w-0 max-w-full">
          {products.length === 0 ? (
            <Reveal className="w-full min-w-0">
              <div className="neon-surface-static mx-auto w-full max-w-xl rounded-card border border-bone/10 bg-charcoal/45 p-8 text-center md:p-12">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-bone/12 bg-ink/50 text-emerald-glow">
                  <ShoppingBag className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </div>
                <h2 className="mt-5 text-h3 text-bone">سبد خرید شما خالی است</h2>
                <p className="mx-auto mt-3 max-w-md text-bone-dim">
                  برای شروع خرید، از صفحه دوره محصول موردنظر را به سبد اضافه کن.
                </p>
                <div className="mt-8 flex justify-center">
                  <LinkButton href="/course/campaign-writing" variant="primary" size="lg" withArrow>
                    مشاهده دوره کمپین‌نویسی
                  </LinkButton>
                </div>
              </div>
            </Reveal>
          ) : (
            <div className="mx-auto grid w-full min-w-0 max-w-5xl grid-cols-1 gap-6 md:grid-cols-12 md:gap-8">
              <div className="min-w-0 md:col-span-7 md:col-start-1">
                <div className="flex w-full min-w-0 flex-col gap-4">
                  {products.map((product) => (
                    <CartProductCard key={product.slug} product={product} />
                  ))}
                </div>
              </div>

              <div className="min-w-0 md:col-span-5 md:col-start-8">
                <aside className="neon-surface-static w-full min-w-0 rounded-card border border-bone/10 bg-charcoal/45 p-5 sm:p-6 md:sticky md:top-24 md:p-8">
                  <h2 className="text-h3 text-bone">خلاصه سفارش</h2>

                  <ul className="mt-5 space-y-3 border-b border-bone/10 pb-5">
                    {products.map((product) => (
                      <li
                        key={product.slug}
                        className="flex w-full min-w-0 items-start justify-between gap-4 text-sm"
                      >
                        <span className="min-w-0 flex-1 leading-relaxed text-bone-dim">{product.title}</span>
                        <span className="shrink-0 whitespace-nowrap text-bone num-latin">
                          {formatFa(product.effective_price)}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex w-full min-w-0 items-center justify-between gap-4">
                    <span className="shrink-0 text-bone">جمع کل</span>
                    <div className="text-end">
                      <span className="text-h2 text-bone num-latin">{formatFa(total)}</span>
                      <span className="ms-2 text-caption text-mist">تومان</span>
                    </div>
                  </div>

                  <div className="mt-8 w-full min-w-0">
                    {products.length === 1 ? (
                      <CartCheckoutButton slug={products[0]!.slug} />
                    ) : (
                      <div className="space-y-3">
                        {products.map((product) => (
                          <CartCheckoutButton key={product.slug} slug={product.slug} />
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="mt-4 text-center text-sm leading-relaxed text-mist">
                    در مرحله بعد اطلاعات خریدار را وارد می‌کنی و به درگاه پرداخت منتقل می‌شوی.
                  </p>
                </aside>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
