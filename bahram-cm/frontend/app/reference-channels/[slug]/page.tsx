import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Check,
  Network,
  Radio,
  ShoppingBag,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { MobileStickyEnrollBar } from "@/components/commerce/MobileStickyEnrollBar";
import { ProductPurchaseCta } from "@/components/commerce/ProductPurchaseCta";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SitePhotoHeroFrame } from "@/components/sections/SitePhotoHeroFrame";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { coalesceAlt, staticAltForSrc } from "@/lib/media/altShared";
import { primarySiteImageSrc } from "@/lib/mediaUrl";
import { formatFa, toPersianDigits } from "@/lib/persian";
import { getProductBySlug } from "@/lib/services/products";
import { buildMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import {
  pageHeroBackdropPhoto,
  pageHeroBackdropPhotoMobile,
  sitePhotos,
} from "@/lib/site-photo-paths";

const heroPurchaseCtaClassName =
  "h-12 min-h-12 w-full px-8 text-base font-bold shadow-gold sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14 md:px-10 md:text-lg";

const heroDesktopAlt = coalesceAlt(
  staticAltForSrc(pageHeroBackdropPhoto),
  "کانال مرجع آکادمی بهرام",
  pageHeroBackdropPhoto,
);
const heroMobileAlt = coalesceAlt(
  staticAltForSrc(pageHeroBackdropPhotoMobile),
  "کانال مرجع آکادمی بهرام",
  pageHeroBackdropPhotoMobile,
);

const benefitCards: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Users,
    title: "گروه ۱۰۰ نفری خودت",
    body: "ثبت‌نام می‌کنی و زیرمجموعه خودت را می‌سازی — گروهی تا ۱۰۰ نفر که با تو کار می‌کنند.",
  },
  {
    icon: ShoppingBag,
    title: "فروش دوره‌ها و محصولات",
    body: "دوره‌ها و محصولات آکادمی را می‌فروشی و مستقیم از هر فروش سهم می‌گیری.",
  },
  {
    icon: BadgePercent,
    title: "درصد از هر فروش",
    body: "از هر فروشی که انجام می‌دهی درصد برمی‌داری — درآمد مستقیم، نه وعده.",
  },
  {
    icon: Network,
    title: "شبکه فروش فعال",
    body: "به‌جای کار تکی، یک کانال مرجع داری که تیم و فروش را کنار هم نگه می‌دارد.",
  },
];

const whoFor = [
  "می‌خواهی از فروش آموزش و محصولات آکادمی درآمد مستقیم بسازی.",
  "حاضری گروه خودت را بسازی و با تیم کار کنی.",
  "دنبال مسیر کمیسیون‌محور هستی، نه فقط مصرف محتوا.",
  "می‌خواهی به شبکه فروش آکادمی وصل شوی.",
];

const notFor = [
  "فقط می‌خواهی عضو شوی و هیچ فروشی نکنی.",
  "دنبال درآمد بدون فعالیت و پیگیری هستی.",
  "حاضر نیستی با افراد زیرمجموعه‌ات در ارتباط باشی.",
];

const faqs = [
  {
    question: "کانال مرجع چیست؟",
    answer:
      "کانالی است که در آن ثبت‌نام می‌کنی، گروه زیرمجموعه تا ۱۰۰ نفر می‌سازی و با فروش دوره‌ها و محصولات آکادمی از هر فروش درصد می‌گیری.",
  },
  {
    question: "درآمد چطور ساخته می‌شود؟",
    answer:
      "با فروش دوره‌ها و محصولات آکادمی. هر فروشی که انجام بدهی، سهم مستقیم خودت را برمی‌داری.",
  },
  {
    question: "گروه ۱۰۰ نفری یعنی چه؟",
    answer:
      "بعد از عضویت می‌توانی زیرمجموعه خودت را داشته باشی — گروهی که با تو در مسیر فروش و معرفی محصولات کار می‌کند.",
  },
  {
    question: "چطور وارد کانال مرجع شوم؟",
    answer:
      "ثبت‌نام و پرداخت را انجام می‌دهی؛ بعد از احراز هویت، دسترسی کانال و مسیر عضویت برایت باز می‌شود.",
  },
];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getProductBySlug(`reference-${slug}`);
  if (!result.ok || result.data.type !== "reference_channel") return {};
  const product = result.data;

  return buildMetadata({
    title: product.title || "کانال مرجع",
    description:
      product.meta_description ||
      product.short_description ||
      "کانال مرجع آکادمی بهرام؛ ثبت‌نام، گروه ۱۰۰ نفری و درآمد مستقیم از فروش دوره‌ها و محصولات.",
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
  const result = await getProductBySlug(`reference-${slug}`);

  if (!result.ok || result.data.type !== "reference_channel") {
    notFound();
  }

  const product = result.data;
  const productSlug = product.slug;
  const alreadyPurchased = product.already_purchased ?? false;
  const pricing = product.reference_pricing;
  const listPrice = pricing?.amount ?? product.price;
  const finalPrice = pricing?.final_amount ?? product.effective_price;
  const seminarOff = pricing?.seminar_off ?? finalPrice < listPrice;
  const hasDiscount = seminarOff && finalPrice < listPrice;
  const discountPercent = hasDiscount
    ? Math.round(((listPrice - finalPrice) / listPrice) * 100)
    : null;
  const originalPriceLabel = hasDiscount ? `${formatFa(listPrice)} تومان` : null;
  const priceLabel = `${formatFa(finalPrice)} تومان`;

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip pb-20 md:pb-0">
      <link
        rel="preload"
        as="image"
        href={primarySiteImageSrc(pageHeroBackdropPhotoMobile)}
        media="(max-width: 767px)"
        fetchPriority="high"
      />
      <link
        rel="preload"
        as="image"
        href={primarySiteImageSrc(pageHeroBackdropPhoto)}
        media="(min-width: 768px)"
        fetchPriority="high"
      />

      <section className="campaign-course-hero relative isolate w-full overflow-hidden bg-ink">
        <SitePhotoHeroFrame
          desktopSrc={pageHeroBackdropPhoto}
          mobileSrc={pageHeroBackdropPhotoMobile}
          desktopAlt={heroDesktopAlt}
          mobileAlt={heroMobileAlt}
        >
          <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center overflow-visible px-4 pb-8 pt-16 sm:bottom-4 sm:pb-7 sm:pt-24 md:bottom-0 md:pb-8 md:pt-28">
            <div className="campaign-course-hero-headline-outer">
              <div className="campaign-course-hero-headline-wrap">
                <h1 className="campaign-course-hero-headline">
                  <span className="campaign-course-hero-eyebrow">آکادمی</span>
                  <span className="campaign-course-hero-title">کانال مرجع</span>
                </h1>
              </div>
            </div>
            <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-stretch sm:justify-center md:max-w-2xl md:gap-4">
              <ProductPurchaseCta
                productSlug={productSlug}
                alreadyPurchased={alreadyPurchased}
                location="reference_channel_hero"
                panelHref="/panel/reference-channel"
                ownedLabel="مشاهده در پنل"
                variant="vip"
                withArrow
                size="lg"
                className={heroPurchaseCtaClassName}
              >
                عضویت
              </ProductPurchaseCta>
              <LinkButton
                href="#about"
                variant="ghost"
                size="lg"
                withArrow
                className={cn(
                  "h-12 min-h-12 w-full border-white/25 bg-black/30 text-white backdrop-blur-md",
                  "hover:border-white/40 hover:bg-white/10 hover:text-white",
                  "sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14",
                )}
              >
                بیشتر بدان
              </LinkButton>
            </div>
          </div>
        </SitePhotoHeroFrame>
      </section>

      {/* Intro — price */}
      <section
        id="hero-purchase"
        className="campaign-course-intro relative scroll-mt-20 overflow-visible bg-ink py-12 sm:py-16 md:py-20 lg:py-24"
      >
        <div aria-hidden className="campaign-course-intro-glow" />
        <div className="container-luxe relative z-[1] min-w-0">
          <div className="campaign-course-intro-layout">
            <div className="campaign-course-intro-cluster">
              <Reveal delay={0.1}>
                <div className="campaign-course-intro-income-wrap">
                  <p className="campaign-course-intro-income">
                    <span className="campaign-course-intro-income__lead">درآمد</span>
                    <span className="campaign-course-intro-income__range">مستقیم</span>
                    <span className="campaign-course-intro-income__tail">از هر فروش</span>
                  </p>
                  <p className="campaign-course-intro-students">
                    <span className="campaign-course-intro-students__plus" aria-hidden>
                      +
                    </span>
                    <span className="campaign-course-intro-students__count">
                      {toPersianDigits("100")}
                    </span>
                    <span className="campaign-course-intro-students__label">نفر در گروه تو</span>
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.16}>
                <div className="campaign-course-intro-price">
                  {discountPercent ? (
                    <div className="campaign-course-intro-price-ribbon">
                      {toPersianDigits(String(discountPercent))}٪ تخفیف ویژه
                    </div>
                  ) : null}

                  <div className="campaign-course-intro-price-body">
                    {originalPriceLabel ? (
                      <p className="campaign-course-intro-was num-latin">{originalPriceLabel}</p>
                    ) : null}

                    <p className="campaign-course-intro-now">
                      <span className="campaign-course-intro-now__amount num-latin">
                        {formatFa(finalPrice)}
                      </span>
                      <span className="campaign-course-intro-now__unit">تومان</span>
                    </p>
                    {hasDiscount ? (
                      <p className="mt-2 text-caption text-emerald">ویژه شرکت‌کنندگان سمینار</p>
                    ) : null}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="scroll-mt-20 bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">درباره کانال مرجع</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                کانال مرجع؛ ثبت‌نام، تیم خودت، درآمد مستقیم
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:text-body">
                کانال مرجع کانالی است که افراد در آن ثبت‌نام می‌کنند و می‌توانند گروه‌های
                زیرمجموعه {toPersianDigits("100")} نفری خودشان را داشته باشند. با فروش دوره‌ها و
                محصولات آکادمی درآمد مستقیم می‌سازند و از هر فروشی که دارند درصد برمی‌دارند.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-8 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>چرا کانال مرجع؟</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-2 text-h3 text-balance sm:mt-3 md:mt-5 md:text-h2">
                چهار ستون مسیر درآمد تو
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                عضویت فقط تماشا نیست؛ ساختن گروه و گرفتن سهم از فروش است.
              </p>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:gap-5">
            {benefitCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.06}>
                <FeatureCard
                  icon={card.icon}
                  title={card.title}
                  description={card.body}
                  tone={i % 2 === 0 ? "emerald" : "gold"}
                  variant="compact"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Split story */}
      <ImageSplitSection
        eyebrow="مسیر درآمد"
        title="با تیم خودت بفروش و از هر فروش سهم بگیر"
        image={sitePhotos.landscapeSession}
        imageAlt="کانال مرجع و مسیر فروش تیمی"
        imagePosition="end"
        tone="gold"
      >
        <p>
          بعد از ثبت‌نام، گروه زیرمجموعه تا {toPersianDigits("100")} نفر می‌سازی. دوره‌ها و
          محصولات آکادمی را معرفی و می‌فروشی — و از هر فروش، درصد مستقیم خودت را برمی‌داری.
        </p>
        <ul className="mt-6 space-y-3">
          {[
            "ثبت‌نام در کانال مرجع",
            "ساخت گروه زیرمجموعه ۱۰۰ نفری",
            "فروش دوره‌ها و محصولات آکادمی",
            "برداشت درصد از هر فروش",
          ].map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-bone-dim md:text-base">
              <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-gold/70" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ImageSplitSection>

      {/* Who for */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مخاطب کانال مرجع</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">برای چه کسی است؟</h2>
          </Reveal>

          <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6">
            <Reveal delay={0.1}>
              <article className="rounded-card-lg border border-emerald/20 bg-emerald/5 p-5 md:p-6">
                <h3 className="flex items-center gap-2 text-lg font-bold text-bone">
                  <Radio className="h-5 w-5 text-emerald-glow" aria-hidden />
                  مناسب توست اگر
                </h3>
                <ul className="mt-4 space-y-3">
                  {whoFor.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim md:text-base">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.8} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
            <Reveal delay={0.16}>
              <article className="rounded-card-lg border border-bone/10 bg-charcoal/40 p-5 md:p-6">
                <h3 className="text-lg font-bold text-bone">مناسب نیست اگر</h3>
                <ul className="mt-4 space-y-3">
                  {notFor.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim md:text-base">
                      <span className="mt-1.5 inline-flex h-1.5 w-1.5 shrink-0 rounded-full bg-bone-mute" aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="grid min-w-0 items-start gap-10 md:grid-cols-12 md:gap-10 lg:items-center lg:gap-14">
            <div className="min-w-0 md:col-span-7">
              <Reveal>
                <Eyebrow>سوالات متداول</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-3 max-w-3xl text-h2 text-balance md:mt-5">
                  قبل از عضویت این‌ها را بخوان
                </h2>
              </Reveal>
              <div className="mt-6 md:mt-10">
                <Reveal delay={0.12}>
                  <Accordion items={faqs} />
                </Reveal>
              </div>
            </div>

            <div className="min-w-0 md:col-span-5">
              <Reveal delay={0.16}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-bone/10 bg-charcoal/40 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.75)] sm:rounded-[1.5rem]">
                  <SiteImage
                    src={sitePhotos.referenceChannelFaq}
                    alt={coalesceAlt(
                      staticAltForSrc(sitePhotos.referenceChannelFaq),
                      "کانال مرجع — فضای تیم و فروش",
                      sitePhotos.referenceChannelFaq,
                    )}
                    fill
                    sizes="(max-width: 767px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Enroll */}
      <section id="enroll" className="campaign-course-enroll scroll-mt-20">
        <div className="campaign-course-enroll__surface relative overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
          <div aria-hidden className="campaign-course-enroll__ambient pointer-events-none absolute inset-0" />
          <div className="container-luxe relative z-[1] min-w-0">
            <div className="campaign-course-enroll-layout">
              <Reveal>
                <div className="campaign-course-enroll-copy">
                  <Eyebrow
                    className="campaign-course-enroll__eyebrow justify-center"
                    dotClassName="campaign-course-enroll__eyebrow-dot"
                  >
                    عضویت
                  </Eyebrow>
                  <h2 className="campaign-course-enroll__title mt-3 text-h2 text-balance md:mt-4">
                    آماده‌ای گروه خودت را بسازی؟
                  </h2>
                  <p className="campaign-course-enroll__lead mx-auto mt-4 max-w-md text-sm leading-relaxed md:text-body">
                    ثبت‌نام در کانال مرجع — گروه {toPersianDigits("100")} نفری و درآمد مستقیم از فروش.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1} className="w-full min-w-0">
                <div className="flex w-full flex-col items-stretch gap-4">
                  <div className="campaign-course-intro-price campaign-course-enroll-price campaign-course-enroll-price-card">
                    {discountPercent ? (
                      <div className="campaign-course-intro-price-ribbon">
                        {toPersianDigits(String(discountPercent))}٪ تخفیف ویژه
                      </div>
                    ) : null}

                    <div className="campaign-course-intro-price-body">
                      {originalPriceLabel ? (
                        <p className="campaign-course-intro-was num-latin">{originalPriceLabel}</p>
                      ) : null}

                      <p className="campaign-course-intro-now">
                        <span className="campaign-course-intro-now__amount num-latin">
                          {formatFa(finalPrice)}
                        </span>
                        <span className="campaign-course-intro-now__unit">تومان</span>
                      </p>
                    </div>
                  </div>

                  <ProductPurchaseCta
                    productSlug={productSlug}
                    alreadyPurchased={alreadyPurchased}
                    location="reference_channel_enroll"
                    panelHref="/panel/reference-channel"
                    ownedLabel="مشاهده در پنل"
                    variant="vip"
                    withArrow
                    size="lg"
                    className="campaign-course-price-cta relative z-[1] h-12 min-h-12 w-full max-w-none font-bold shadow-gold md:h-14 md:min-h-14"
                  >
                    عضویت در کانال مرجع
                  </ProductPurchaseCta>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <MobileStickyEnrollBar
        priceLabel={priceLabel}
        alreadyPurchased={alreadyPurchased}
        productSlug={productSlug}
        title="کانال مرجع"
        location="reference_channel_mobile_bar"
        panelHref="/panel/reference-channel"
        ownedLabel="مشاهده در پنل"
      />
    </main>
  );
}

function ImageSplitSection({
  eyebrow,
  title,
  image,
  imageAlt,
  imagePosition = "start",
  tone = "emerald",
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  image: string;
  imageAlt: string;
  imagePosition?: "start" | "end";
  tone?: "emerald" | "gold";
  className?: string;
  children: ReactNode;
}) {
  const imageFirst = imagePosition === "start";

  return (
    <section className={cn("py-10 md:py-section-sm lg:py-section", className)}>
      <div className="container-luxe min-w-0">
        <div
          className={cn(
            "grid items-center gap-5 sm:gap-6 md:grid-cols-12 md:gap-10 lg:gap-14",
            !imageFirst && "md:[&>div:first-child]:order-2 md:[&>div:last-child]:order-1",
          )}
        >
          <div className={cn("max-md:order-2 md:col-span-5", !imageFirst && "md:order-2")}>
            <Reveal delay={imageFirst ? 0.1 : 0}>
              <div className="relative overflow-hidden rounded-card-lg border border-bone/10">
                <div className="relative aspect-[4/3] sm:aspect-[5/4] md:aspect-[4/5] lg:aspect-[5/6]">
                  <SiteImage
                    src={image}
                    alt={imageAlt}
                    fallbackAlt={imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                  <div aria-hidden className="photo-scrim-bottom" />
                  <div
                    aria-hidden
                    className={cn(
                      "absolute inset-0",
                      tone === "gold"
                        ? "bg-gradient-to-t from-transparent via-transparent to-gold/10"
                        : "bg-gradient-to-t from-transparent via-transparent to-emerald/10",
                    )}
                  />
                </div>
              </div>
            </Reveal>
          </div>
          <div className={cn("max-md:order-1 md:col-span-7", !imageFirst && "md:order-1")}>
            <Reveal delay={imageFirst ? 0 : 0.1}>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">{title}</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <div className="mt-4 max-w-2xl text-sm leading-relaxed text-bone-dim md:mt-6 md:text-body">
                {children}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
