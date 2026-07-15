import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import type { LucideIcon } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import {
  ArrowLeft,
  Award,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  GraduationCap,
  Layers,
  MessageSquare,
  Package,
  PenLine,
  Phone,
  Repeat2,
  Route,
  Sparkles,
  UserSearch,
  Users,
  X,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { MobileStickyEnrollBar } from "@/components/commerce/MobileStickyEnrollBar";
import { ProductPurchaseCta } from "@/components/commerce/ProductPurchaseCta";
import { LinkButton } from "@/components/ui/Button";
import { CAMPAIGN_WRITING_SLUG } from "@/lib/cart/constants";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { CampaignWritingSocialProof } from "@/components/sections/CampaignWritingSocialProof";
import { CampaignFaqPortraitSlider } from "@/components/sections/CampaignFaqPortraitSlider";
import { SitePhotoHeroFrame } from "@/components/sections/SitePhotoHeroFrame";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { coalesceAlt, staticAltForSrc } from "@/lib/media/altShared";
import { primarySiteImageSrc } from "@/lib/mediaUrl";
import { resolveMediaAlt } from "@/lib/media/alt";
import { formatFa, toPersianDigits } from "@/lib/persian";
import { getProductBySlug } from "@/lib/services/products";
import { getContentCommentsFromApi } from "@/lib/services/contentComments.server";
import { buildCommentAuthorFromStudent } from "@/lib/contentComments/author";
import { getCurrentStudent } from "@/lib/student/session";
import { ContentCommentsSection } from "@/components/comments/ContentCommentsSection";
import { pageHeroBackdropPhoto, pageHeroBackdropPhotoMobile, sitePhotos } from "@/lib/site-photo-paths";
import { site } from "@/content/site";

const FALLBACK_PRICE = 28_900_000;
const SECTION_COUNT = 5;

const heroDesktopAlt = coalesceAlt(
  staticAltForSrc(pageHeroBackdropPhoto),
  "دوره کمپین‌نویسی",
  pageHeroBackdropPhoto,
);
const heroMobileAlt = coalesceAlt(
  staticAltForSrc(pageHeroBackdropPhotoMobile),
  "دوره کمپین‌نویسی",
  pageHeroBackdropPhotoMobile,
);

const heroPurchaseCtaClassName =
  "h-12 min-h-12 w-full px-8 text-base font-bold shadow-gold sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14 md:px-10 md:text-lg";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "دوره کمپین‌نویسی",
  description:
    "یاد بگیر چطور تبلیغ بنویسی که بفروشد؛ از شناخت مشتری و پیام فروش تا پیشنهاد، مکالمه فروش و پیگیری.",
  path: "/course/campaign-writing",
});

const problemPoints = [
  "تبلیغ می‌کند ولی نتیجه نمی‌گیرد.",
  "پیام فروش درست ندارد.",
  "مشتری خودش را نمی‌شناسد.",
  "بدون برنامه تبلیغ می‌کند.",
];

const whyCards: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Layers,
    title: "یادگیری ساختار کمپین",
    body: "می‌فهمی کمپین از کجا شروع می‌شود، چطور پیش می‌رود و کجا باید به فروش برسد.",
  },
  {
    icon: UserSearch,
    title: "شناخت مشتری",
    body: "نیاز، نگرانی و دلیل خرید مشتری را می‌فهمی تا حرفت به جای درست بنشیند.",
  },
  {
    icon: MessageSquare,
    title: "نوشتن پیام فروش",
    body: "پیام اصلی را ساده، روشن و قانع‌کننده می‌نویسی — نه فقط قشنگ.",
  },
  {
    icon: Package,
    title: "ساخت پیشنهاد خوب",
    body: "پیشنهادی می‌سازی که دلیل خرید داشته باشد و مشتری راحت‌تر تصمیم بگیرد.",
  },
  {
    icon: Route,
    title: "پیگیری فروش",
    body: "یاد می‌گیری بعد از اولین تماس چطور پیگیری کنی تا مشتری به خرید نزدیک‌تر شود.",
  },
];

const curriculumSections: {
  icon: LucideIcon;
  title: string;
  description: string;
  topics: string[];
}[] = [
  {
    icon: Eye,
    title: "بخش ۱ — شناخت کمپین",
    description: "کمپین چیست، با یک تبلیغ ساده چه فرقی دارد و چرا بعضی پیام‌ها فقط دیده می‌شوند.",
    topics: [
      "کمپین برای فروش یعنی چه",
      "فرق کمپین و تبلیغ پراکنده",
      "چه چیزهایی در یک کمپین می‌آید",
      "اشتباهات رایج در شروع",
    ],
  },
  {
    icon: UserSearch,
    title: "بخش ۲ — شناخت مشتری",
    description: "یاد می‌گیری مشتری را از نگاه فروش بشناسی، نه فقط از روی سن و شهر.",
    topics: [
      "نیاز و مشکل واقعی مشتری",
      "نگرانی‌ها و تردیدهای خرید",
      "حرف زدن با زبان خود مشتری",
      "شناخت نوع مشتری",
    ],
  },
  {
    icon: MessageSquare,
    title: "بخش ۳ — نوشتن پیام فروش",
    description: "پیام اصلی کمپین را می‌نویسی؛ ساده، روشن و قابل استفاده.",
    topics: [
      "ساختار یک پیام فروش",
      "تیتر و توضیح کوتاه",
      "دعوت به خرید",
      "پیام مناسب هر جا (اینستا، پیام، تماس)",
    ],
  },
  {
    icon: Package,
    title: "بخش ۴ — ساخت پیشنهاد فروش",
    description: "پیشنهادی می‌سازی که مشتری دلیل خرید داشته باشد.",
    topics: [
      "دیدن محصول از نگاه فروش",
      "مزیت و تفاوت با بقیه",
      "چیدن پیشنهاد خرید",
      "جواب دادن به نگرانی قبل از خرید",
    ],
  },
  {
    icon: Phone,
    title: "بخش ۵ — مکالمه فروش و پیگیری",
    description: "یاد می‌گیری چطور حرف بزنی، پیگیری کنی و مشتری را به خرید نزدیک کنی.",
    topics: [
      "شروع مکالمه فروش",
      "جواب دادن به اعتراض",
      "پیگیری بعد از تماس",
      "رساندن مشتری به خرید",
    ],
  },
];

const resultCards: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Compass,
    title: "طراحی کمپین واقعی",
    body: "می‌توانی برای یک محصول یا خدمت، یک کمپین ساده و قابل اجرا بسازی.",
  },
  {
    icon: UserSearch,
    title: "شناخت مشتری",
    body: "می‌فهمی مشتری چه می‌خواهد، از چه می‌ترسد و چرا باید بخرد — نه با حدس.",
  },
  {
    icon: PenLine,
    title: "نوشتن پیام فروش",
    body: "پیام اصلی را طوری می‌نویسی که مشتری دلیل ادامه دادن پیدا کند.",
  },
  {
    icon: Package,
    title: "ساخت پیشنهاد فروش",
    body: "پیشنهادی می‌سازی که ارزش و دلیل خرید را روشن کند.",
  },
  {
    icon: Repeat2,
    title: "پیگیری تا خرید",
    body: "مسیر پیگیری را می‌چینی تا مشتری احتمالی به خرید نزدیک‌تر شود.",
  },
];

const whoFor = [
  "می‌خواهی کمپین‌نویسی یاد بگیری.",
  "دنبال یک مهارت درآمدزا هستی.",
  "در فروش، بازاریابی یا محتوا کار می‌کنی.",
  "صاحب کسب‌وکار هستی.",
];

const notFor = [
  "دنبال پول سریع بدون تمرین هستی.",
  "فقط می‌خواهی تماشا کنی و تمرین نکنی.",
  "حاضر نیستی روی تمرین‌ها وقت بگذاری.",
];

const instructorHighlights = [
  { icon: Users, tone: "bone" as const, label: "۷۰۰٬۰۰۰+ مخاطب" },
  { icon: GraduationCap, tone: "emerald" as const, label: "۵۰٬۰۰۰+ دانشجو" },
  { icon: Sparkles, tone: "gold" as const, label: "۱۰+ سال تجربه" },
  { icon: Award, tone: "gold" as const, label: "آموزش با تمرین واقعی" },
];

const faqs = [
  {
    question: "آیا برای شروع نیاز به تجربه دارم؟",
    answer:
      "نه. دوره از پایه شروع می‌شود و قدم‌به‌قدم پیش می‌رود. اگر قبلاً در فروش کار کرده‌ای، سریع‌تر جلو می‌روی.",
  },
  {
    question: "دوره تمرین عملی دارد؟",
    answer:
      "بله. تمرکز روی کار عملی است. تمرین داری و در پایان باید بتوانی یک کمپین واقعی طراحی کنی.",
  },
  {
    question: "بعد از دوره پشتیبانی وجود دارد؟",
    answer:
      "بله. بعد از ثبت‌نام به محتوای دوره دسترسی داری و در مسیر یادگیری همراهی می‌گیری.",
  },
  {
    question: "چطور وارد دوره شوم؟",
    answer:
      "درخواست ورود را ثبت می‌کنی، پرداخت را انجام می‌دهی و دسترسی دوره برایت باز می‌شود.",
  },
  {
    question: "آیا محدودیت ظرفیت دارد؟",
    answer:
      "برای حفظ کیفیت، ظرفیت هر دوره محدود است. اگر آماده‌ای، بهتر است زودتر ثبت‌نام کنی.",
  },
];

export default async function CourseCampaignWritingPage() {
  const productResult = await getProductBySlug(CAMPAIGN_WRITING_SLUG);
  const alreadyPurchased = productResult.ok ? (productResult.data.already_purchased ?? false) : false;

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

      {/* 1. HERO — full-width photo + purchase CTA */}
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
                  <span className="campaign-course-hero-eyebrow">دوره</span>
                  <span className="campaign-course-hero-title">شغل کمپین نویسی</span>
                </h1>
              </div>
            </div>
            <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-stretch sm:justify-center md:max-w-2xl md:gap-4">
              <ProductPurchaseCta
                productSlug={CAMPAIGN_WRITING_SLUG}
                alreadyPurchased={alreadyPurchased}
                location="campaign_writing_hero"
                variant="vip"
                withArrow
                size="lg"
                className={heroPurchaseCtaClassName}
              >
                خرید
              </ProductPurchaseCta>
              <LinkButton
                href="#curriculum"
                variant="ghost"
                size="lg"
                withArrow
                className={cn(
                  "h-12 min-h-12 w-full border-white/25 bg-black/30 text-white backdrop-blur-md",
                  "hover:border-white/40 hover:bg-white/10 hover:text-white",
                  "sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14",
                )}
              >
                مشاهده سرفصل‌ها
              </LinkButton>
            </div>
          </div>
        </SitePhotoHeroFrame>
      </section>

      <Suspense fallback={null}>
        <CampaignWritingPageContent />
      </Suspense>
    </main>
  );
}

async function CampaignWritingPageContent() {
  const [productResult, student, commentsResult] = await Promise.all([
    getProductBySlug(CAMPAIGN_WRITING_SLUG),
    getCurrentStudent(),
    getContentCommentsFromApi('campaign_writing', CAMPAIGN_WRITING_SLUG),
  ]);
  const product = productResult.ok ? productResult.data : null;
  const comments = commentsResult.ok ? commentsResult.data : [];
  const alreadyPurchased = product?.already_purchased ?? false;
  const coursePrice = product?.effective_price ?? FALLBACK_PRICE;
  const hasDiscount =
    product !== null && product.sale_price !== null && product.effective_price < product.price;
  const originalPriceLabel =
    hasDiscount && product ? `${formatFa(product.price)} تومان` : null;
  const priceLabel = `${formatFa(coursePrice)} تومان`;
  const discountPercent =
    hasDiscount && product
      ? Math.round(((product.price - coursePrice) / product.price) * 100)
      : null;
  const faqSliderPhotos = await Promise.all(
    [
      sitePhotos.testimonialPortrait[0]!,
      sitePhotos.testimonialPortrait[1]!,
      sitePhotos.testimonialPortrait[2]!,
      sitePhotos.manifestoPortraitA,
      sitePhotos.manifestoPortraitB,
    ].map((src, i) => resolveMediaAlt(src, `دانشجوی دوره کمپین‌نویسی ${i + 1}`).then((alt) => ({ src, alt }))),
  );

  return (
    <>
      {/* 2. COURSE INTRO — price + highlights, open layout */}
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
                    <span className="campaign-course-intro-income__range">
                      {toPersianDigits("21")} تا {toPersianDigits("80")} میلیون
                    </span>
                    <span className="campaign-course-intro-income__tail">در ماه</span>
                  </p>
                  <p className="campaign-course-intro-students">
                    <span className="campaign-course-intro-students__plus" aria-hidden>
                      +
                    </span>
                    <span className="campaign-course-intro-students__count">
                      {toPersianDigits("20")} هزار
                    </span>
                    <span className="campaign-course-intro-students__label">دانشجو</span>
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
                        {formatFa(coursePrice)}
                      </span>
                      <span className="campaign-course-intro-now__unit">تومان</span>
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 3. PROBLEM */}
      <ImageSplitSection
        eyebrow="معرفی مسئله"
        title="مشکل از نبود تبلیغ نیست؛ مشکل از نبود برنامه فروش است"
        image={sitePhotos.manifestoLandscape}
        imageAlt="چالش کمپین‌نویسی بدون برنامه"
        imagePosition="start"
        tone="gold"
      >
        <p>
          خیلی‌ها تبلیغ می‌کنند و محتوا می‌سازند — اما نتیجه نمی‌گیرند. چون نمی‌دانند
          مشتری‌شان کیست، چه می‌خواهد و چرا باید بخرد.
        </p>
        <ul className="mt-6 space-y-3">
          {problemPoints.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-bone-dim md:text-base">
              <span className="mt-1 inline-flex h-2 w-2 shrink-0 rounded-full bg-gold/70" aria-hidden />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ImageSplitSection>

      {/* 3. ABOUT COURSE */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="mx-auto max-w-3xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">درباره دوره</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                کمپین‌نویسی را واقعاً یاد بگیر
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:text-body">
                این دوره فقط تماشا نیست. قدم‌به‌قدم یاد می‌گیری و در پایان یک کمپین واقعی
                طراحی می‌کنی.
              </p>
            </Reveal>

            <div className="mt-8 space-y-4 text-sm leading-relaxed text-bone-dim md:mt-10 md:space-y-5 md:text-body">
              <Reveal delay={0.18}>
                <p>
                  در این دوره یاد می‌گیری مشتری را بشناسی، پیام فروش بنویسی، پیشنهاد خوب بسازی
                  و بعد از تماس، درست پیگیری کنی.
                </p>
              </Reveal>
              <Reveal delay={0.22}>
                <p>
                  تمرکز روی نتیجه است: در پایان باید بتوانی برای یک محصول یا خدمت، یک کمپین
                  ساده و قابل اجرا طراحی کنی.
                </p>
              </Reveal>
              <Reveal delay={0.26}>
                <p>
                  اگر می‌خواهی از نوشتن پراکنده خارج شوی و تبلیغت واقعاً بفروشد، این دوره
                  نقطه شروع توست.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 4. WHY THIS COURSE */}
      <section className="py-8 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>چرا این دوره؟</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-2 text-h3 text-balance sm:mt-3 md:mt-5 md:text-h2">
                پنج مهارت مهم که یاد می‌گیری
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                هر بخش دوره روی یکی از کارهای اصلی کمپین فروش تمرکز دارد.
              </p>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:grid-cols-3 lg:gap-5">
            {whyCards.map((card, i) => (
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

      {/* 5. CURRICULUM */}
      <section id="curriculum" className="scroll-mt-20 bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Reveal>
                <Eyebrow>سرفصل‌های دوره</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">سرفصل‌های دوره</h2>
              </Reveal>
            </div>
            <Reveal delay={0.12}>
              <span className="text-sm text-gold num-latin">
                {toPersianDigits(String(SECTION_COUNT))} بخش
              </span>
            </Reveal>
          </div>

          <div className="mt-6 md:mt-9">
            <Reveal delay={0.1}>
              <Accordion
                items={curriculumSections.map((section) => ({
                  question: section.title,
                  answer: (
                    <SectionAnswer description={section.description} topics={section.topics} />
                  ),
                }))}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. INSTRUCTOR */}
      <section className="py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="grid items-center gap-6 sm:gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
            <div className="max-md:order-2 md:col-span-4">
              <Reveal>
                <PhotoFrame
                  ratio="square"
                  variant="radial"
                  rounded="card-lg"
                  src={sitePhotos.founderAsidePortrait}
                  alt={site.founder}
                  label={site.founder}
                  className="mx-auto max-w-[14rem] border-bone/12 md:mx-0 md:max-w-none"
                  photoCaption="bottom"
                />
              </Reveal>
            </div>
            <div className="max-md:order-1 md:col-span-8">
              <Reveal delay={0.08}>
                <Eyebrow>معرفی مدرس</Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h2 className="mt-3 text-h2 text-balance md:mt-5">
                  {site.founder} — آموزش حاصل تجربه واقعی بازار
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                  {site.founderAside.body}
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone-dim md:text-base">
                  محتوای این دوره از تجربه واقعی فروش و کمپین ساخته شده — نه فقط حرف تئوری.
                  هر بخش از کار واقعی بازار جمع‌بندی شده است.
                </p>
              </Reveal>
              <Reveal delay={0.24}>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 border-t border-bone/8 pt-4 md:mt-8 md:gap-x-6">
                  {instructorHighlights.map((item) => (
                    <IconLabel key={item.label} icon={item.icon} tone={item.tone}>
                      {item.label}
                    </IconLabel>
                  ))}
                </div>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-5">
                  <LinkButton href="/founder" variant="ghost" withArrow size="md">
                    بیشتر درباره بهرام
                  </LinkButton>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 7. RESULTS AFTER COURSE */}
      <section className="bg-obsidian py-8 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>نتایج بعد از دوره</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-2 text-h3 text-balance sm:mt-3 md:mt-5 md:text-h2">بعد از دوره چه بلدی؟</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-3 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                تمرکز روی نتیجه واقعی است — نه فقط تماشای ویدیو.
              </p>
            </Reveal>
          </div>

          <div className="mt-5 grid gap-2.5 sm:mt-8 sm:grid-cols-2 sm:gap-4 md:mt-10 lg:grid-cols-3 lg:gap-5">
            {resultCards.map((card, i) => (
              <Reveal key={card.title} delay={i * 0.06}>
                <FeatureCard
                  icon={card.icon}
                  title={card.title}
                  description={card.body}
                  tone={i % 2 === 0 ? "emerald" : "gold"}
                  variant="compact"
                  className="rounded-card-lg bg-charcoal/40"
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* 8. WHO IS IT FOR */}
      <section className="py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مخاطب دوره</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">
              این دوره مناسب چه کسانی است؟
            </h2>
          </Reveal>

          <div className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2 md:gap-6">
            <Reveal delay={0.1}>
              <article
                data-neon-tone="emerald"
                className="neon-surface-static h-full rounded-card-lg border border-emerald/25 bg-emerald-deep/10 p-5 sm:p-6"
              >
                <h3 className="text-base font-semibold text-bone sm:text-lg">مناسب توست اگر:</h3>
                <ul className="mt-4 space-y-3">
                  {whoFor.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-bone-dim md:text-base">
                      <CheckCircle2
                        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            <Reveal delay={0.16}>
              <article className="h-full rounded-card-lg border border-bone/10 bg-charcoal/30 p-5 sm:p-6">
                <h3 className="text-base font-semibold text-bone sm:text-lg">مناسب تو نیست اگر:</h3>
                <ul className="mt-4 space-y-3">
                  {notFor.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim md:text-base">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist" strokeWidth={1.6} aria-hidden />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <CampaignWritingSocialProof />

      <ContentCommentsSection
        type="campaign_writing"
        slug={CAMPAIGN_WRITING_SLUG}
        initialComments={comments}
        initialAuthor={buildCommentAuthorFromStudent(student)}
      />

      {/* 10. FAQ */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="grid min-w-0 items-start gap-10 md:grid-cols-12 md:gap-10 lg:items-center lg:gap-14">
            <div className="min-w-0 md:col-span-7">
              <Reveal>
                <Eyebrow>سوالات متداول</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-3 max-w-3xl text-h2 text-balance md:mt-5">
                  سؤال‌های مهم قبل از ثبت‌نام
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
                <CampaignFaqPortraitSlider slides={faqSliderPhotos} />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ENROLL */}
      <section id="enroll" className="campaign-course-enroll scroll-mt-20">
        <div className="campaign-course-enroll__surface relative overflow-hidden py-12 sm:py-16 md:py-20 lg:py-24">
          <div
            aria-hidden
            className="campaign-course-enroll__ambient pointer-events-none absolute inset-0"
          />
          <div className="container-luxe relative z-[1] min-w-0">
            <div className="campaign-course-enroll-layout">
              <Reveal>
                <div className="campaign-course-enroll-copy">
                  <Eyebrow
                    className="campaign-course-enroll__eyebrow justify-center"
                    dotClassName="campaign-course-enroll__eyebrow-dot"
                  >
                    ثبت‌نام
                  </Eyebrow>
                  <h2 className="campaign-course-enroll__title mt-3 text-h2 text-balance md:mt-4">
                    آماده‌ای کمپین‌نویسی را جدی یاد بگیری؟
                  </h2>
                  <p className="campaign-course-enroll__lead mx-auto mt-4 max-w-md text-sm leading-relaxed md:text-body">
                    {toPersianDigits(String(SECTION_COUNT))} بخش عملی — از شناخت مشتری تا طراحی
                    کمپین واقعی.
                  </p>
                </div>
              </Reveal>

              <Reveal delay={0.1}>
                <EnrollCard
                  coursePrice={coursePrice}
                  originalPriceLabel={originalPriceLabel}
                  discountPercent={discountPercent}
                  alreadyPurchased={alreadyPurchased}
                />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <MobileStickyEnrollBar priceLabel={priceLabel} alreadyPurchased={alreadyPurchased} />
    </>
  );
}

function SectionAnswer({ description, topics }: { description: string; topics: string[] }) {
  return (
    <div className="space-y-4">
      <p>{description}</p>
      <ul className="space-y-2.5">
        {topics.map((topic) => (
          <li key={topic} className="flex items-start gap-2.5 text-sm md:text-base">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow"
              strokeWidth={1.8}
              aria-hidden
            />
            <span>{topic}</span>
          </li>
        ))}
      </ul>
    </div>
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

function EnrollCard({
  coursePrice,
  originalPriceLabel,
  discountPercent,
  alreadyPurchased,
}: {
  coursePrice: number;
  originalPriceLabel: string | null;
  discountPercent: number | null;
  alreadyPurchased: boolean;
}) {
  return (
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
            {formatFa(coursePrice)}
          </span>
          <span className="campaign-course-intro-now__unit">تومان</span>
        </p>

        <ProductPurchaseCta
          productSlug={CAMPAIGN_WRITING_SLUG}
          alreadyPurchased={alreadyPurchased}
          location="campaign_writing_enroll"
          variant="vip"
          withArrow
          size="lg"
          className="campaign-course-price-cta h-12 min-h-12 w-full font-bold shadow-gold md:h-14 md:min-h-14"
        >
          خرید
        </ProductPurchaseCta>
      </div>
    </div>
  );
}
