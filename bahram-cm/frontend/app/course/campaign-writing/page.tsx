import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  FileText,
  Layers,
  Megaphone,
  MessageSquare,
  PenLine,
  Route,
  Target,
  UserSearch,
  X,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { CampaignLearnScroll } from "@/components/sections/CampaignLearnScroll";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { resolveMediaAlt } from "@/lib/media/alt";
import { formatFa } from "@/lib/persian";
import { pageHeroBackdropPhoto, sitePhotos } from "@/lib/site-photo-paths";

const COURSE_PRICE = 28_900_000;

export const metadata: Metadata = buildMetadata({
  title: "دوره شغل کمپین‌نویسی",
  description:
    "از نوشتن پیام فروش تا ساختن کمپین واقعی — یاد بگیر مخاطب را بشناسی، پیام بسازی، اعتماد ایجاد کنی و مسیر فروش طراحی کنی.",
  path: "/course/campaign-writing",
});

const learnItems = [
  {
    text: "قبل از نوشتن، مخاطب را تحلیل کنی.",
    image: sitePhotos.storyStep[0]!,
    alt: "تحلیل مخاطب",
  },
  {
    text: "پیام اصلی کمپین را بسازی.",
    image: sitePhotos.manifestoPortraitA,
    alt: "طراحی پیام کمپین",
  },
  {
    text: "تیتر، متن تبلیغاتی، پیشنهاد فروش و دعوت به اقدام بنویسی.",
    image: sitePhotos.courseBackstage,
    alt: "نوشتن متن تبلیغاتی",
  },
  {
    text: "سناریوی فروش طراحی کنی.",
    image: sitePhotos.storyStep[1]!,
    alt: "سناریوی فروش",
  },
  {
    text: "لید را پیگیری کنی و مسیر تصمیم‌گیری مخاطب را کامل‌تر کنی.",
    image: sitePhotos.landscapeSession,
    alt: "پیگیری لید",
  },
];

const whoFor = [
  {
    icon: Megaphone,
    title: "ورود به تبلیغات و فروش",
    body: "برای کسانی که می‌خواهند وارد دنیای تبلیغات، فروش و کمپین شوند.",
    image: sitePhotos.social[0]!,
  },
  {
    icon: PenLine,
    title: "علاقه به نوشتن و بازاریابی",
    body: "برای کسانی که به نوشتن، بازاریابی و فروش علاقه دارند.",
    image: sitePhotos.social[1]!,
  },
  {
    icon: Target,
    title: "مهارت کاربردی",
    body: "برای کسانی که می‌خواهند یک مهارت کاربردی یاد بگیرند.",
    image: sitePhotos.social[2]!,
  },
  {
    icon: Route,
    title: "مسیر فروش واقعی",
    body: "برای کسانی که می‌خواهند بفهمند چطور از یک پیام ساده، یک مسیر فروش ساخته می‌شود.",
    image: sitePhotos.social[3]!,
  },
];

const outcomes = [
  "یک محصول را تحلیل کنی.",
  "مخاطب هدف را بهتر بشناسی.",
  "پیام تبلیغاتی دقیق‌تر بنویسی.",
  "پیشنهاد فروش جذاب‌تری طراحی کنی.",
  "برای کمپین، ساختار و مسیر مشخص بسازی.",
  "متن‌هایی بنویسی که فقط زیبا نیستند؛ هدفمند هستند.",
];

const learningPath = [
  {
    n: "۱",
    title: "شناخت کمپین",
    body: "درک می‌کنی کمپین چیست، چرا بعضی پیام‌ها می‌فروشند و بعضی فقط دیده می‌شوند.",
    icon: Eye,
    image: sitePhotos.storyStep[0]!,
  },
  {
    n: "۲",
    title: "شناخت مخاطب",
    body: "یاد می‌گیری چطور نیاز، ترس، تردید و انگیزه مخاطب را پیدا کنی.",
    icon: UserSearch,
    image: sitePhotos.storyStep[1]!,
  },
  {
    n: "۳",
    title: "طراحی پیام فروش",
    body: "یاد می‌گیری پیام اصلی کمپین را بسازی؛ پیامی که ساده، شفاف و قانع‌کننده باشد.",
    icon: MessageSquare,
    image: sitePhotos.manifestoPortraitA,
  },
  {
    n: "۴",
    title: "نوشتن متن تبلیغاتی",
    body: "تیتر، متن کوتاه، متن معرفی، CTA و پیام‌های فروش را تمرین می‌کنی.",
    icon: PenLine,
    image: sitePhotos.courseBackstage,
  },
  {
    n: "۵",
    title: "ساخت پیشنهاد فروش",
    body: "یاد می‌گیری چطور محصول را به شکلی ارائه کنی که مخاطب دلیل واضحی برای خرید داشته باشد.",
    icon: FileText,
    image: sitePhotos.storyStep[2]!,
  },
  {
    n: "۶",
    title: "سناریوی فروش و پیگیری",
    body: "می‌فهمی بعد از دیده شدن کمپین، چطور مسیر ارتباط، تماس، پیگیری و تصمیم‌گیری مخاطب را کامل کنی.",
    icon: Layers,
    image: sitePhotos.landscapeSession,
  },
];

const faqs = [
  {
    question: "آیا پیش‌نیاز خاصی لازم است؟",
    answer:
      "نیازی نیست از قبل متخصص تبلیغات باشی. این دوره از پایه شروع می‌شود و مرحله‌به‌مرحله تو را وارد فضای واقعی کمپین‌نویسی می‌کند.",
  },
  {
    question: "خروجی نهایی دوره چیست؟",
    answer:
      "هدف دوره این است که فقط متن ننویسی؛ بتوانی یک مسیر فروش طراحی کنی — از تحلیل مخاطب تا پیام، پیشنهاد، کمپین و پیگیری.",
  },
  {
    question: "تفاوت این دوره با دوره‌های محتوا چیست؟",
    answer:
      "اینجا فقط درباره نوشتن متن حرف نمی‌زنیم. کمپین‌نویسی را به عنوان یک مهارت اجرایی یاد می‌گیری؛ مهارتی که به فروش، ارتباط با مشتری، پیشنهادسازی و نتیجه گرفتن وصل است.",
  },
  {
    question: "قیمت دوره چقدر است؟",
    answer: `قیمت دوره ${formatFa(COURSE_PRICE)} تومان است.`,
  },
];

export default async function CourseCampaignWritingPage() {
  const priceLabel = `${formatFa(COURSE_PRICE)} تومان`;
  const heroAlt = await resolveMediaAlt(pageHeroBackdropPhoto, "دوره کمپین‌نویسی آکادمی بهرام");

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0">
          <SiteImage
            src={pageHeroBackdropPhoto}
            alt={heroAlt}
            fallbackAlt="دوره کمپین‌نویسی آکادمی بهرام"
            fill
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/55 via-ink/82 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] min-w-0 py-8 sm:py-12 md:py-20 lg:py-24">
          <div className="grid min-w-0 items-center gap-6 sm:gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
            <div className="min-w-0 text-center max-md:order-2 md:col-span-7 md:text-start">
              <Reveal>
                <Eyebrow>دوره شغل کمپین‌نویسی</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-3 max-w-xl text-[clamp(1.625rem,6vw,2.25rem)] font-display leading-[1.12] text-balance md:mt-5 md:text-h1 lg:text-display">
                  کمپین بساز
                  <br />
                  که نتیجه بدهد
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-dim sm:mt-4 md:mx-0 md:mt-6 md:max-w-lg md:text-body">
                  از شناخت مخاطب تا پیام فروش و مسیر فروش — گام‌به‌گام.
                </p>
              </Reveal>
              <Reveal delay={0.2}>
                <div className="mx-auto mt-5 flex w-full flex-col gap-2.5 sm:mt-7 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3 md:mt-9 md:mx-0 md:justify-start">
                  <LinkButton
                    href="#enroll"
                    variant="sales"
                    size="lg"
                    withArrow
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                  >
                    شروع یادگیری
                  </LinkButton>
                  <LinkButton
                    href="#path"
                    variant="ghost"
                    size="lg"
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                  >
                    مسیر دوره
                  </LinkButton>
                </div>
              </Reveal>
            </div>

            <div className="min-w-0 max-md:order-1 md:col-span-5">
              <Reveal delay={0.12}>
                <HeroPhoto />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* WHY IMPORTANT */}
      <ImageSplitSection
        id="why"
        eyebrow="چرا مهم است؟"
        title="چرا کمپین‌نویسی مهم است؟"
        image={sitePhotos.manifestoLandscape}
        imageAlt="فضای کار کمپین‌نویسی"
        imagePosition="start"
        tone="emerald"
      >
        <p>
          خیلی از کسب‌وکارها محصول خوبی دارند، اما نمی‌دانند چطور آن را درست معرفی کنند. مشکل
          همیشه محصول نیست؛ گاهی پیام اشتباه است، پیشنهاد واضح نیست، مسیر فروش کامل نیست یا
          مخاطب دلیل کافی برای خرید پیدا نمی‌کند.
        </p>
        <p className="mt-4 font-medium text-bone md:mt-5">
          کمپین‌نویس کسی است که این مسیر را می‌سازد.
        </p>
        <p className="mt-3 text-bone-dim md:mt-4">
          او می‌فهمد مخاطب چه می‌خواهد، چه تردیدی دارد، چرا باید اعتماد کند و چه چیزی او را به
          اقدام می‌رساند.
        </p>
      </ImageSplitSection>

      <CampaignLearnScroll items={learnItems} />

      {/* WHO IS IT FOR */}
      <section className="py-10 md:py-section-sm">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مخاطب دوره</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              این دوره برای چه کسانی مناسب است؟
            </h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-body">
              نیازی نیست از قبل متخصص تبلیغات باشی. این دوره از پایه شروع می‌شود و
              مرحله‌به‌مرحله تو را وارد فضای واقعی کمپین‌نویسی می‌کند.
            </p>
          </Reveal>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:mt-10">
            {whoFor.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <AudienceCard {...item} tone={i % 2 === 0 ? "emerald" : "gold"} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* OUTCOMES */}
      <ImageSplitSection
        eyebrow="بعد از دوره"
        title="بعد از دوره چه توانایی‌هایی داری؟"
        image={sitePhotos.academyStory}
        imageAlt="خروجی یادگیری کمپین‌نویسی"
        imagePosition="end"
        tone="gold"
        className="bg-obsidian"
      >
        <ul className="space-y-3 md:space-y-3.5">
          {outcomes.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm text-bone-dim md:text-base">
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow md:h-[1.125rem] md:w-[1.125rem]"
                strokeWidth={1.6}
                aria-hidden
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </ImageSplitSection>

      {/* LEARNING PATH */}
      <section id="path" className="scroll-mt-20 py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>مسیر یادگیری</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">مسیر یادگیری دوره</h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-body">
              شش گام از شناخت کمپین تا سناریوی فروش و پیگیری — هر مرحله با تمرین و خروجی عملی.
            </p>
          </Reveal>

          <div className="mt-6 space-y-4 sm:space-y-5 md:mt-12 md:space-y-8">
            {learningPath.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.04}>
                <LearningPathRow step={step} reverse={i % 2 === 1} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* DIFFERENCE */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-3xl">
            <Reveal>
              <Eyebrow>تفاوت دوره</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-4 text-h2 text-balance md:mt-6">این دوره چه تفاوتی دارد؟</h2>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-base">
                اینجا فقط درباره نوشتن متن حرف نمی‌زنیم. کمپین‌نویسی را به عنوان یک مهارت اجرایی
                یاد می‌گیری؛ مهارتی که به فروش، ارتباط با مشتری، پیشنهادسازی و نتیجه گرفتن وصل
                است.
              </p>
            </Reveal>
          </div>

          <div className="neon-surface-framed mt-6 overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/40 md:mt-12">
            <div className="grid grid-cols-1 border-b border-bone/8 md:grid-cols-2">
              <div className="p-4 text-bone-dim sm:p-5 md:p-9">
                <p className="text-[0.65rem] uppercase tracking-[0.18em] text-mist sm:text-caption sm:tracking-[0.3em]">
                  فقط نوشتن
                </p>
                <p className="mt-2 font-display text-sm font-semibold leading-snug text-bone sm:text-base md:mt-3 md:text-xl">
                  متن زیبا بدون مسیر فروش
                </p>
              </div>
              <div className="relative border-t border-bone/8 bg-gradient-to-br from-gold/[0.12] via-gold/[0.04] to-transparent p-4 sm:p-5 md:border-s md:border-t-0 md:p-9">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_100%_0%,color-mix(in_oklab,var(--color-gold)_22%,transparent),transparent_65%)]"
                />
                <p className="relative text-[0.65rem] uppercase tracking-[0.18em] text-gold sm:text-caption sm:tracking-[0.3em]">
                  کمپین‌نویسی
                </p>
                <p className="relative mt-2 font-display text-sm font-semibold leading-snug text-bone sm:text-base md:mt-3 md:text-xl">
                  مهارت اجرایی با نتیجه واقعی
                </p>
              </div>
            </div>

            {[
              {
                left: "فقط تیتر و متن می‌نویسی.",
                right: "مخاطب را تحلیل می‌کنی و پیام اصلی می‌سازی.",
              },
              {
                left: "پیشنهاد فروش مبهم می‌ماند.",
                right: "پیشنهاد جذاب با دلیل واضح برای خرید طراحی می‌کنی.",
              },
              {
                left: "کمپین دیده می‌شود اما نتیجه نمی‌دهد.",
                right: "مسیر ارتباط، پیگیری و تصمیم‌گیری را کامل می‌کنی.",
              },
            ].map((row) => (
              <div
                key={row.left}
                className="grid grid-cols-1 border-b border-bone/6 last:border-b-0 md:grid-cols-2"
              >
                <div className="flex items-start gap-2.5 p-3.5 text-bone-dim sm:gap-3 sm:p-4 md:gap-4 md:p-7">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-bone/12 text-mist sm:h-8 sm:w-8 md:h-9 md:w-9">
                    <X className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.6} aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 text-sm leading-relaxed md:text-body">{row.left}</p>
                </div>
                <div className="relative flex items-start gap-2.5 border-t border-bone/6 bg-gradient-to-br from-gold/[0.07] via-transparent to-transparent p-3.5 text-bone sm:gap-3 sm:p-4 md:gap-4 md:border-s md:border-t-0 md:p-7">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill border border-gold/35 bg-gold/[0.12] text-gold shadow-[0_0_16px_-4px_color-mix(in_oklab,var(--color-gold)_40%,transparent)] sm:h-8 sm:w-8 md:h-9 md:w-9">
                    <Check className="h-3.5 w-3.5 md:h-4 md:w-4" strokeWidth={1.8} aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 text-sm font-medium leading-relaxed text-bone md:text-body">
                    {row.right}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <Reveal delay={0.2}>
            <p className="mt-6 max-w-2xl text-sm text-bone-dim md:mt-8 md:text-base">
              تمرکز دوره روی این است که بتوانی برای یک محصول واقعی، پیام واقعی و مسیر فروش واقعی
              طراحی کنی.
            </p>
          </Reveal>
        </div>
      </section>

      {/* NOT JUST WRITING */}
      <section className="py-10 md:py-section-sm">
        <div className="container-luxe min-w-0">
          <div className="neon-cta-slab relative overflow-hidden rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/40 via-charcoal/70 to-ink p-4 sm:p-8 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]"
            />
            <div className="relative grid gap-6 sm:gap-8 md:grid-cols-12 md:items-center md:gap-10">
              <div className="md:col-span-7">
                <IconTile icon={PenLine} tone="gold" size="lg" />
                <h2 className="mt-4 text-h3 text-balance sm:mt-5 md:mt-6 md:text-h2">
                  اگر می‌خواهی فقط بنویسی، این دوره کافی نیست
                </h2>
                <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-body">
                  این دوره برای کسی است که می‌خواهد بفهمد چرا یک متن می‌فروشد، چرا یک پیشنهاد
                  جذاب می‌شود، چرا یک مخاطب اعتماد می‌کند و چطور می‌شود از توجه مخاطب، یک اقدام
                  واقعی ساخت.
                </p>
                <p className="mt-4 font-medium text-bone md:mt-5">
                  اگر دنبال یک مهارت جدی در تبلیغات و فروش هستی، کمپین‌نویسی نقطه شروع قدرتمندی
                  است.
                </p>
              </div>
              <div className="md:col-span-5">
                <PhotoFrame
                  ratio="landscape"
                  variant="grid"
                  rounded="card-lg"
                  label="کمپین واقعی"
                  src={sitePhotos.squareBackstage}
                  alt="پشت صحنه طراحی کمپین"
                  className="border-bone/12 shadow-none neon-surface-framed"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="enroll" className="scroll-mt-20 bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>ثبت‌نام</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              سرمایه‌گذاری روی مهارت فروش‌ساز
            </h2>
          </Reveal>
          <Reveal delay={0.14}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-body">
              این دوره برای شروع یک مسیر تازه طراحی شده؛ مسیری که از شناخت مخاطب شروع می‌شود و
              به ساختن پیام، پیشنهاد، کمپین و فروش می‌رسد.
            </p>
          </Reveal>

          <div className="mt-8 md:mt-10">
            <Reveal delay={0.1}>
              <article
                data-neon-tone="emerald"
                className="neon-cta-slab relative mx-auto max-w-2xl overflow-hidden rounded-card-lg border border-emerald/40 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink p-5 sm:p-8 md:p-10"
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_5%,rgba(0,140,150,0.22),transparent_70%)]"
                />
                <div className="relative">
                  <Badge tone="emerald">دوره کمپین‌نویسی</Badge>
                  <h3 className="mt-4 text-h3 text-bone md:mt-5">مسیر کامل از پایه تا اجرا</h3>
                  <p className="mt-2 text-sm text-bone-dim md:text-base">
                    شش مرحله یادگیری، تمرین عملی و طراحی مسیر فروش واقعی.
                  </p>
                  <p className="relative mt-5 break-words text-[clamp(1.25rem,5vw,2rem)] font-semibold leading-tight text-bone num-latin md:mt-8 md:text-h2">
                    {priceLabel}
                  </p>
                  <ul className="relative mt-6 space-y-2.5 md:mt-7 md:space-y-3">
                    {[
                      "شناخت کمپین و مخاطب",
                      "طراحی پیام و متن تبلیغاتی",
                      "ساخت پیشنهاد فروش",
                      "سناریوی فروش و پیگیری لید",
                    ].map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-bone-dim md:text-base">
                        <CheckCircle2
                          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-glow"
                          strokeWidth={1.6}
                          aria-hidden
                        />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <LinkButton
                    href="/apply"
                    variant="sales"
                    withArrow
                    size="lg"
                    className="relative mt-8 w-full md:mt-10"
                  >
                    ورود به دوره کمپین‌نویسی
                  </LinkButton>
                </div>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 md:py-section-sm">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>سوالات متداول</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              پرسش‌های کلیدی قبل از ثبت‌نام
            </h2>
          </Reveal>
          <div className="mt-6 md:mt-10">
            <Reveal>
              <Accordion items={faqs} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-10 md:py-section-sm lg:py-section-xl">
        <div className="container-luxe min-w-0">
          <div className="neon-cta-slab relative overflow-hidden rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/40 via-charcoal/70 to-ink p-4 sm:p-6 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]"
            />
            <div className="relative flex flex-col gap-5 sm:gap-6 md:grid md:grid-cols-12 md:items-center md:gap-10">
              <div className="order-2 min-w-0 text-center md:order-1 md:col-span-7 md:text-start">
                <div className="flex justify-center md:justify-start">
                  <IconTile icon={Compass} tone="gold" size="lg" className="max-sm:scale-90" />
                </div>
                <h2 className="mt-4 max-w-full text-[clamp(1.25rem,5.5vw,1.75rem)] font-display leading-snug text-balance sm:text-h3 md:mt-8 md:text-h2 lg:text-display">
                  آماده‌ای کمپین‌نویسی را جدی یاد بگیری؟
                </h2>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-bone-dim sm:mt-4 md:mx-0 md:mt-6 md:max-w-2xl md:text-body">
                  این دوره برای شروع یک مسیر تازه طراحی شده؛ مسیری که از شناخت مخاطب شروع
                  می‌شود و به ساختن پیام، پیشنهاد، کمپین و فروش می‌رسد.
                </p>
                <div className="mx-auto mt-5 flex w-full max-w-sm flex-col gap-2.5 sm:mt-6 md:mx-0 md:mt-10 md:max-w-none md:flex-row md:flex-wrap md:items-center md:gap-4">
                  <LinkButton
                    href="/apply"
                    variant="primary"
                    size="lg"
                    withArrow
                    className={cn("w-full min-w-0 md:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                  >
                    شروع مسیر کمپین‌نویسی
                  </LinkButton>
                  <Link
                    href="#enroll"
                    className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm text-gold transition-colors hover:text-gold-soft md:w-auto md:justify-start md:py-0"
                  >
                    مشاهده قیمت
                    <ArrowLeft className="rtl-flip h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </div>
              </div>
              <div className="order-1 min-w-0 md:order-2 md:col-span-5">
                <div className="relative mx-auto w-full max-w-[10.5rem] sm:max-w-[12rem] md:max-w-sm md:ms-auto md:me-0 lg:max-w-none">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-4 -z-[1] hidden rounded-card-lg bg-emerald-deep/35 blur-2xl md:block md:-inset-6 md:blur-3xl"
                  />
                  <PhotoFrame
                    ratio="square"
                    variant="radial"
                    rounded="card-lg"
                    badge="مسیر جدید"
                    label="کمپین‌نویسی"
                    src={sitePhotos.manifestoPortraitB}
                    alt="شروع مسیر کمپین‌نویسی"
                    className="border-bone/12 neon-surface-framed md:hidden"
                    photoCaption="none"
                  />
                  <PhotoFrame
                    ratio="portrait"
                    variant="radial"
                    rounded="card-lg"
                    badge="مسیر جدید"
                    label="کمپین‌نویسی"
                    src={sitePhotos.manifestoPortraitB}
                    alt="شروع مسیر کمپین‌نویسی"
                    className="hidden border-bone/12 neon-surface-framed md:block"
                    photoCaption="none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function HeroPhoto() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,18rem)] sm:max-w-xs md:mx-0 md:max-w-none">
      <div className="overflow-hidden rounded-card-lg border border-bone/12 bg-charcoal/30">
        <SiteImage
          src={sitePhotos.manifestoLandscape}
          alt="دوره کمپین‌نویسی"
          fallbackAlt="دوره کمپین‌نویسی"
          width={900}
          height={700}
          sizes="(max-width: 768px) min(100vw - 2rem, 20rem), (max-width: 1024px) 40vw, 33vw"
          className="h-auto w-full"
          priority
        />
      </div>
    </div>
  );
}

function ImageSplitSection({
  id,
  eyebrow,
  title,
  image,
  imageAlt,
  imagePosition = "start",
  tone = "emerald",
  className,
  children,
}: {
  id?: string;
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
    <section id={id} className={cn("py-10 md:py-section-sm lg:py-section", className)}>
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
                <div className="relative aspect-[16/10] sm:aspect-[5/4] md:aspect-[4/5] lg:aspect-[5/6]">
                  <SiteImage
                    src={image}
                    alt={imageAlt}
                    fallbackAlt={imageAlt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 40vw"
                  />
                  <div
                    aria-hidden
                    className={cn(
                      "absolute inset-0",
                      tone === "gold"
                        ? "bg-gradient-to-t from-ink/60 via-ink/10 to-gold/10"
                        : "bg-gradient-to-t from-ink/60 via-ink/10 to-emerald/10",
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

function AudienceCard({
  icon: Icon,
  title,
  body,
  image,
  tone,
}: {
  icon: typeof Megaphone;
  title: string;
  body: string;
  image: string;
  tone: "emerald" | "gold";
}) {
  return (
    <article className="group relative min-h-[10.5rem] overflow-hidden rounded-card-lg border border-bone/10 sm:min-h-[12rem]">
      <SiteImage
        src={image}
        alt={title}
        fallbackAlt={title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 640px) 100vw, 50vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/20" />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 opacity-60",
          tone === "gold"
            ? "bg-gradient-to-br from-gold/20 via-transparent to-transparent"
            : "bg-gradient-to-br from-emerald-glow/18 via-transparent to-transparent",
        )}
      />
      <div className="relative flex h-full min-h-[10.5rem] flex-col justify-end gap-2.5 p-4 sm:min-h-[12rem] sm:gap-3 sm:p-5 md:p-6">
        <IconTile icon={Icon} tone={tone} size="sm" />
        <h3 className="text-base font-semibold leading-snug text-bone sm:text-lg">{title}</h3>
        <p className="text-sm leading-relaxed text-bone-dim">{body}</p>
      </div>
    </article>
  );
}

function LearningPathRow({
  step,
  reverse,
}: {
  step: (typeof learningPath)[number];
  reverse?: boolean;
}) {
  const Icon = step.icon;

  return (
    <article className="neon-surface-static overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/40">
      <div
        className={cn(
          "grid md:grid-cols-12 md:items-stretch",
          reverse && "md:[&>div:first-child]:order-2",
        )}
      >
        <div className={cn("relative min-h-[10rem] sm:min-h-[12rem] md:col-span-5 md:min-h-[14rem]", reverse && "md:order-2")}>
          <SiteImage
            src={step.image}
            alt={step.title}
            fallbackAlt={step.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 42vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent md:bg-gradient-to-l md:from-ink/40 md:via-transparent md:to-transparent" />
          <span className="absolute start-3 top-3 rounded-pill border border-bone/20 bg-charcoal/80 px-2.5 py-0.5 text-caption text-bone backdrop-blur sm:start-4 sm:top-4 sm:px-3 sm:py-1">
            مرحله {step.n}
          </span>
        </div>
        <div className={cn("flex flex-col justify-center p-4 sm:p-5 md:col-span-7 md:p-8", reverse && "md:order-1")}>
          <IconTile icon={Icon} tone="emerald" size="md" />
          <h3 className="mt-3 text-lg font-semibold text-bone sm:mt-4 sm:text-h3 md:mt-5">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-bone-dim md:mt-3 md:text-base">{step.body}</p>
        </div>
      </div>
    </article>
  );
}
