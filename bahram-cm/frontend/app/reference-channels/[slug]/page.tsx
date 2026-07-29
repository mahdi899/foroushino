import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Check,
  GraduationCap,
  Handshake,
  Package,
  Radio,
  Sparkles,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { HydratedMobileStickyEnrollBar } from "@/components/commerce/HydratedMobileStickyEnrollBar";
import { HydratedProductPriceCard } from "@/components/commerce/HydratedProductPriceCard";
import { HydratedProductPurchaseCta } from "@/components/commerce/HydratedProductPurchaseCta";
import {
  ProductPurchaseProvider,
  type ProductPurchaseState,
} from "@/components/commerce/ProductPurchaseProvider";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { SitePhotoHeroFrame } from "@/components/sections/SitePhotoHeroFrame";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { coalesceAlt } from "@/lib/media/altShared";
import { primarySiteImageSrc } from "@/lib/mediaUrl";
import { formatFa, toPersianDigits } from "@/lib/persian";
import { getPublicProductBySlug, productPurchaseInitial } from "@/lib/services/products";
import { buildMetadata } from "@/lib/seo";
import { notFound } from "next/navigation";
import { sitePhotos } from "@/lib/site-photo-paths";
import { ensureStaticPageCache } from "@/lib/cache/staticPage";

const fallbackHero = sitePhotos.mainPathReference;
const fallbackHeroMobile = sitePhotos.mainPathReferenceMobile;

const heroPurchaseCtaClassName =
  "h-12 min-h-12 w-full px-8 text-base font-bold shadow-gold sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14 md:px-10 md:text-lg";

function resolveReferenceHero(product: {
  featured_image?: string | null;
  featured_image_mobile?: string | null;
  featured_image_alt?: string | null;
  featured_image_mobile_alt?: string | null;
  title?: string | null;
}) {
  const desktopSrc = product.featured_image?.trim() || fallbackHero;
  const mobileSrc =
    product.featured_image_mobile?.trim() ||
    product.featured_image?.trim() ||
    fallbackHeroMobile;
  const fallbackAlt =
    product.title?.trim() || "کانال مرجع — محصول آماده، آموزش فروش و درآمد مستقیم";
  const desktopAlt = coalesceAlt(product.featured_image_alt, fallbackAlt, desktopSrc);
  const mobileAlt = coalesceAlt(
    product.featured_image_mobile_alt ?? product.featured_image_alt,
    fallbackAlt,
    mobileSrc,
  );
  return { desktopSrc, mobileSrc, desktopAlt, mobileAlt };
}

const pillarCards: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Package,
    title: "محصول آماده",
    body: "محصول برای فروش در اختیار توست؛ لازم نیست از صفر بسازی.",
  },
  {
    icon: GraduationCap,
    title: "آموزش فروش",
    body: "فروش، محتوا، کمپین و پیگیری را عملی یاد می‌گیری.",
  },
  {
    icon: Handshake,
    title: "کوچینگ و همراهی",
    body: "در مسیر اجرا همراهت هستیم تا مسیرت را اصلاح کنی.",
  },
  {
    icon: BadgePercent,
    title: "درآمد مستقیم از فروش",
    body: "بعد از هر فروش تأییدشده، سهم تو محاسبه می‌شود.",
  },
];

const whatYouGet = [
  "محصول آماده برای فروش",
  "آموزش ساخت کانال فروش",
  "نقشه محتوایی جذب و اعتمادسازی",
  "ایده و نمونه محتوای فروش",
  "ساختار اجرای کمپین",
  "آموزش پیگیری و بستن فروش",
  "کوچینگ و همراهی در مسیر",
];

const pathSteps = [
  { step: "۱", title: "شروع", body: "با محصول و مدل همکاری آشنا می‌شوی." },
  { step: "۲", title: "ساخت کانال", body: "کانالت را برای جذب و اعتماد آماده می‌کنی." },
  { step: "۳", title: "جذب مخاطب", body: "افراد درست را وارد کانال خودت می‌کنی." },
  { step: "۴", title: "تولید محتوا", body: "محتوایی می‌سازی که مخاطب را به خرید نزدیک کند." },
  { step: "۵", title: "اجرای کمپین", body: "محصول را معرفی می‌کنی و فروش را شروع می‌کنی." },
  { step: "۶", title: "پیگیری و فروش", body: "مخاطبان آماده را پیگیری می‌کنی و فروش را می‌بندی." },
  { step: "۷", title: "تکرار و رشد", body: "نتیجه را بررسی می‌کنی و بهتر از قبل ادامه می‌دهی." },
];

const whoFor = [
  "می‌خواهی از فروش محصول درآمد داشته باشی",
  "هنوز محصول خودت را نداری",
  "می‌خواهی فروش را عملی یاد بگیری",
  "حاضری محتوا تولید کنی و پیگیری داشته باشی",
];

const notFor = [
  "دنبال درآمد بدون فعالیت هستی",
  "فکر می‌کنی فقط با عضویت درآمد می‌سازی",
  "نمی‌خواهی محتوا و فروش را اجرا کنی",
];

const faqs = [
  {
    question: "کانال مرجع چیست؟",
    answer:
      "مسیر اجرایی فروش است که در آن محصول، آموزش و محتوا دریافت می‌کنی و در کانال خودت می‌فروشی.",
  },
  {
    question: "آیا باید محصول خودم را داشته باشم؟",
    answer: "خیر، محصول برای فروش در اختیار تو قرار می‌گیرد.",
  },
  {
    question: "فروش در کجا انجام می‌شود؟",
    answer: "در کانال و فضای ارتباطی خودت.",
  },
  {
    question: "آیا درآمد تضمینی است؟",
    answer: "خیر، نتیجه به اجرای تو، استمرار و کیفیت عملکردت بستگی دارد.",
  },
];

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicProductBySlug(`reference-${slug}`);
  if (!result.ok || result.data.type !== "reference_channel") return {};
  const product = result.data;

  return buildMetadata({
    title: product.title || "کانال مرجع",
    description:
      product.meta_description ||
      product.short_description ||
      "محصول آماده است؛ تو فقط فروش را یاد بگیر. کانال مرجع آکادمی بهرام — محصول، آموزش و درآمد مستقیم از فروش.",
    path: `/reference-channels/${slug}`,
    image: product.featured_image || fallbackHero,
  });
}

export default async function ReferenceChannelLandingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await ensureStaticPageCache();
  const { slug } = await params;
  const result = await getPublicProductBySlug(`reference-${slug}`);

  if (!result.ok || result.data.type !== "reference_channel") {
    notFound();
  }

  const product = result.data;
  const productSlug = product.slug;
  const purchase = productPurchaseInitial(product) as ProductPurchaseState;
  const listPrice = purchase.listPrice;
  const finalPrice = purchase.finalPrice;
  const hasDiscount = purchase.hasDiscount;
  const originalPriceLabel = hasDiscount ? `${formatFa(listPrice)} تومان` : null;
  const hero = resolveReferenceHero(product);

  return (
    <ProductPurchaseProvider productSlug={productSlug} initial={purchase}>
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip pb-20 md:pb-0">
      <link
        rel="preload"
        as="image"
        href={primarySiteImageSrc(hero.desktopSrc)}
        fetchPriority="high"
      />

      <section className="campaign-course-hero relative isolate w-full overflow-hidden bg-ink">
        <SitePhotoHeroFrame
          desktopSrc={hero.desktopSrc}
          mobileSrc={hero.mobileSrc}
          desktopAlt={hero.desktopAlt}
          mobileAlt={hero.mobileAlt}
          mobileImageClassName="object-[left_22%]"
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
              <HydratedProductPurchaseCta
                fallback={purchase}
                productSlug={productSlug}
                location="reference_channel_hero"
                panelHref="/panel/reference-channel"
                ownedLabel="مشاهده در پنل"
                variant="vip"
                withArrow
                size="lg"
                className={heroPurchaseCtaClassName}
              >
                ورود به کانال مرجع
              </HydratedProductPurchaseCta>
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

      {/* Promise + price */}
      <section
        id="hero-purchase"
        className="campaign-course-intro relative scroll-mt-20 overflow-visible bg-ink py-12 sm:py-16 md:py-20 lg:py-24"
      >
        <div aria-hidden className="campaign-course-intro-glow" />
        <div className="container-luxe relative z-[1] min-w-0">
          <div className="campaign-course-intro-layout">
            <div className="campaign-course-intro-cluster">
              <Reveal delay={0.08}>
                <div className="mx-auto max-w-2xl text-center">
                  <p className="text-h3 text-balance text-bone md:text-h2">
                    محصول آماده است؛
                    <br />
                    تو فقط فروش را یاد بگیر
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-bone-dim md:text-body">
                    محصول، محتوا و مسیر اجرا را از ما بگیر؛ در کانال خودت بفروش و از فروش‌های خودت
                    درآمد داشته باش.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.14}>
                <HydratedProductPriceCard
                  fallback={purchase}
                  guestRibbonLabel="عضویت ویژه"
                />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* Four pillars */}
      <section className="py-8 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>چهار ستون مسیر</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-2 text-h3 text-balance sm:mt-3 md:mt-5 md:text-h2">
                داخل کانال مرجع چه می‌گیری؟
              </h2>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:gap-5">
            {pillarCards.map((card, i) => (
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

      {/* About */}
      <section id="about" className="scroll-mt-20 bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">کانال مرجع چیست؟</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                یک مسیر اجرایی برای شروع فروش
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:text-body">
                ما محصول، محتوا و آموزش را در اختیارت می‌گذاریم و تو یاد می‌گیری چطور در کانال خودت
                مخاطب جذب کنی، اعتماد بسازی و فروش انجام دهی.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <ul className="mx-auto mt-8 grid max-w-xl gap-3 text-start sm:grid-cols-2">
                {[
                  "ما محصول را می‌دهیم",
                  "تو کانال خودت را می‌سازی",
                  "با آموزش‌ها محتوا و کمپین اجرا می‌کنی",
                  "از فروش‌های خودت سهم می‌گیری",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim md:text-base">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow" strokeWidth={1.8} aria-hidden />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Why + deliverables */}
      <ImageSplitSection
        eyebrow="چرا کانال مرجع؟"
        title="برای شروع فروش، لازم نیست همه‌چیز را از صفر بسازی"
        image={sitePhotos.referenceChannelWhy}
        imageAlt="قیف فروش کانال مرجع — از محتوا تا درآمد"
        imagePosition="end"
        tone="gold"
      >
        <p>
          در کانال مرجع به تو کمک می‌کنیم محصول آماده داشته باشی، محتوای درست تولید کنی، فروش و
          پیگیری را یاد بگیری و با کوچینگ مسیرت را اصلاح کنی.
        </p>
        <ul className="mt-6 space-y-3">
          {whatYouGet.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-bone-dim md:text-base">
              <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-gold/70" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ImageSplitSection>

      {/* Path */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مسیر تو در کانال مرجع</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">هفت گام تا فروش و رشد</h2>
          </Reveal>

          <ol className="mt-8 grid gap-3 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {pathSteps.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.04}>
                <li className="rounded-card-lg border border-bone/10 bg-charcoal/35 p-5">
                  <p className="text-caption font-bold text-gold">{toPersianDigits(item.step)}</p>
                  <h3 className="mt-2 text-base font-bold text-bone">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-bone-dim">{item.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* Important note */}
      <section className="py-10 md:py-section-sm">
        <div className="container-luxe min-w-0">
          <Reveal>
            <div className="mx-auto max-w-3xl rounded-card-lg border border-gold/20 bg-gold/5 p-6 text-center md:p-8">
              <Sparkles className="mx-auto h-6 w-6 text-gold" aria-hidden />
              <h2 className="mt-3 text-h3 text-balance text-bone">نکته مهم</h2>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim md:text-body">
                برای شروع، لازم نیست هزاران مخاطب داشته باشی.{" "}
                {toPersianDigits("100")} مخاطب هدفمند، از هزاران عضو غیرفعال ارزشمندتر است.
              </p>
              <p className="mt-5 text-sm font-semibold text-bone">تمرکز تو روی این ۳ چیز است:</p>
              <ul className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {["جذب درست", "اعتمادسازی", "تبدیل به فروش"].map((item) => (
                  <li
                    key={item}
                    className="rounded-full border border-gold/25 bg-ink/40 px-3 py-1.5 text-caption text-bone"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Who for */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مخاطب کانال مرجع</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">مناسب چه کسی است؟</h2>
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
                <h3 className="text-lg font-bold text-bone">مناسب تو نیست اگر</h3>
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

      {/* Income */}
      <section className="py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">درآمد چطور ساخته می‌شود؟</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                از اجرای درست، نه صرف عضویت
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:text-body">
                فرمول ساده: محصول آماده + محتوای درست + جذب مخاطب هدفمند + پیگیری اصولی = فروش بیشتر.
                بعد از هر فروش تأییدشده، سهم تو محاسبه می‌شود.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-3xl">
            <Reveal>
              <Eyebrow>سوالات متداول</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 max-w-3xl text-h2 text-balance md:mt-5">قبل از ورود این‌ها را بخوان</h2>
            </Reveal>
            <div className="mt-6 md:mt-10">
              <Reveal delay={0.12}>
                <Accordion items={faqs} />
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
                    جمع‌بندی
                  </Eyebrow>
                  <h2 className="campaign-course-enroll__title mt-3 text-h2 text-balance md:mt-4">
                    محصول آماده است. مسیر فروش مشخص است. حالا نوبت اجرای توست.
                  </h2>
                  <p className="campaign-course-enroll__lead mx-auto mt-4 max-w-md text-sm leading-relaxed md:text-body">
                    اگر می‌خواهی فقط آموزش نبینی و وارد اجرای واقعی شوی، کانال مرجع برای توست.
                  </p>
                  {hasDiscount ? (
                    <p className="mt-3 text-caption text-emerald">
                      قیمت ویژه شرکت‌کنندگان سمینار: {formatFa(listPrice)} تومان →{" "}
                      {formatFa(finalPrice)} تومان
                    </p>
                  ) : null}
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <div className="campaign-course-intro-price campaign-course-enroll-price campaign-course-enroll-price-card">
                  {hasDiscount ? (
                    <div className="campaign-course-intro-price-ribbon">ویژه سمینار</div>
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

                    <HydratedProductPurchaseCta
                      fallback={purchase}
                      productSlug={productSlug}
                      location="reference_channel_enroll"
                      panelHref="/panel/reference-channel"
                      ownedLabel="مشاهده در پنل"
                      variant="vip"
                      withArrow
                      size="lg"
                      className="campaign-course-price-cta h-12 min-h-12 w-full font-bold shadow-gold md:h-14 md:min-h-14"
                    >
                      ورود به کانال مرجع
                    </HydratedProductPurchaseCta>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <HydratedMobileStickyEnrollBar
        fallback={purchase}
        productSlug={productSlug}
        location="reference_channel_mobile_bar"
        panelHref="/panel/reference-channel"
        ownedLabel="مشاهده در پنل"
      />
    </main>
    </ProductPurchaseProvider>
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
                <div className="relative aspect-[16/9] sm:aspect-[5/4] md:aspect-[4/5] lg:aspect-[5/6]">
                  <SiteImage
                    src={image}
                    alt={imageAlt}
                    fallbackAlt={imageAlt}
                    fill
                    className="object-cover object-[left_center] md:object-center"
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
