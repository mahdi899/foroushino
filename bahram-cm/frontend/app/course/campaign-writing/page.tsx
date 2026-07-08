import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { buildMetadata } from "@/lib/seo";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Compass,
  Eye,
  Flag,
  GraduationCap,
  MessageSquare,
  Package,
  PenLine,
  Phone,
  Repeat2,
  Route,
  Search,
  Tag,
  UserSearch,
  X,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { AddToCartButton } from "@/components/commerce/AddToCartButton";
import { LinkButton } from "@/components/ui/Button";
import { CAMPAIGN_WRITING_SLUG } from "@/lib/cart/constants";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { PageHeroBackdrop } from "@/components/blocks/PageHeroBackdrop";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { resolveMediaAlt } from "@/lib/media/alt";
import { formatFa, toPersianDigits } from "@/lib/persian";
import { pageHeroBackdropPhoto, sitePhotos } from "@/lib/site-photo-paths";
import { site } from "@/content/site";

const COURSE_PRICE = 28_900_000;
const CURRICULUM_LENGTH = 8;

export const metadata: Metadata = buildMetadata({
  title: "دوره شغل کمپین‌نویسی",
  description:
    "یاد بگیر چطور برای یک محصول، پیام فروش‌ساز طراحی کنی؛ از شناخت مخاطب و ساخت پیشنهاد تا نوشتن سناریو، پیگیری و تبدیل توجه مخاطب به اقدام.",
  path: "/course/campaign-writing",
});

const problemItems: { icon: LucideIcon; title: string }[] = [
  { icon: MessageSquare, title: "پیام نامشخص" },
  { icon: UserSearch, title: "مخاطب نامشخص" },
  { icon: Tag, title: "پیشنهاد نامشخص" },
];

const flowSteps: { icon: LucideIcon; label: string }[] = [
  { icon: Package, label: "شناخت محصول" },
  { icon: UserSearch, label: "شناخت مخاطب" },
  { icon: MessageSquare, label: "طراحی پیام" },
  { icon: Tag, label: "ساخت پیشنهاد" },
  { icon: PenLine, label: "نوشتن سناریو" },
  { icon: Repeat2, label: "پیگیری" },
  { icon: Flag, label: "اقدام" },
];

const outcomes = [
  "تحلیل محصول و مزیت فروش",
  "شناخت مخاطب و نیاز واقعی او",
  "نوشتن پیام فروش‌ساز",
  "طراحی پیشنهاد قانع‌کننده",
  "نوشتن سناریوی تماس یا ارتباط",
  "طراحی مسیر پیگیری",
  "ساخت یک کمپین ساده، قابل اجرا و هدفمند",
];

const curriculum: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Eye,
    title: "فصل ۱: شناخت کمپین",
    body: "کمپین چیست، چه تفاوتی با یک تبلیغ ساده دارد و چرا بعضی پیام‌ها فقط دیده می‌شوند اما بعضی پیام‌ها می‌فروشند.",
  },
  {
    icon: UserSearch,
    title: "فصل ۲: شناخت مخاطب",
    body: "یاد می‌گیری نیاز، ترس، تردید، خواسته و انگیزه مخاطب را پیدا کنی.",
  },
  {
    icon: Tag,
    title: "فصل ۳: شناخت محصول و پیشنهاد فروش",
    body: "یاد می‌گیری محصول را از نگاه فروش تحلیل کنی و پیشنهادی بسازی که دلیل خرید داشته باشد.",
  },
  {
    icon: MessageSquare,
    title: "فصل ۴: طراحی پیام فروش",
    body: "یاد می‌گیری پیام اصلی کمپین را واضح، کوتاه، قانع‌کننده و قابل فهم بسازی.",
  },
  {
    icon: PenLine,
    title: "فصل ۵: نوشتن متن تبلیغاتی",
    body: "نوشتن تیتر، متن معرفی، متن کوتاه تبلیغاتی، CTA و پیام‌های متناسب با کانال‌های مختلف.",
  },
  {
    icon: Phone,
    title: "فصل ۶: سناریوی فروش و تماس",
    body: "یاد می‌گیری برای شروع مکالمه، پاسخ به اعتراض، پیگیری و بستن فروش سناریو طراحی کنی.",
  },
  {
    icon: Repeat2,
    title: "فصل ۷: پیگیری و تبدیل لید",
    body: "یاد می‌گیری چطور مخاطبی را که هنوز نخریده، درست پیگیری کنی و مسیر تصمیم‌گیری او را کامل‌تر کنی.",
  },
  {
    icon: Flag,
    title: "فصل ۸: اجرای کمپین واقعی",
    body: "در پایان دوره باید بتوانی برای یک محصول، یک مسیر کمپین ساده و فروش‌محور طراحی کنی.",
  },
];

const shallowCopywriting = [
  "تمرکز روی جمله‌های قشنگ",
  "بدون شناخت عمیق مخاطب",
  "بدون مسیر پیگیری",
  "بدون اتصال به فروش",
];

const salesCampaignWriting = [
  "شناخت مخاطب",
  "پیام هدفمند",
  "پیشنهاد واضح",
  "سناریوی فروش",
  "پیگیری و اقدام",
];

const whoFor = [
  "می‌خواهی وارد دنیای فروش و تبلیغات شوی.",
  "به نوشتن، مذاکره، کمپین و فروش علاقه داری.",
  "از آموزش‌های پراکنده و تئوری خسته شده‌ای.",
  "دنبال مهارتی هستی که قابل تمرین و اجرا باشد.",
];

const notFor = [
  "اگر انتظار نتیجه بدون تمرین داری.",
  "اگر علاقه‌ای به تحلیل مخاطب نداری.",
  "اگر فقط دنبال چند جمله آماده تبلیغاتی هستی.",
];

const practicalPath: { icon: LucideIcon; label: string }[] = [
  { icon: GraduationCap, label: "مفاهیم پایه" },
  { icon: Search, label: "تحلیل محصول و مخاطب" },
  { icon: MessageSquare, label: "ساخت پیام فروش" },
  { icon: Tag, label: "طراحی پیشنهاد" },
  { icon: PenLine, label: "نوشتن سناریو" },
  { icon: Repeat2, label: "تمرین پیگیری" },
  { icon: Flag, label: "کمپین نهایی" },
];

const faqs = [
  {
    question: "آیا این دوره برای افراد مبتدی مناسب است؟",
    answer:
      "بله، دوره از پایه شروع می‌شود و مفاهیم کمپین‌نویسی را مرحله‌به‌مرحله توضیح می‌دهد.",
  },
  {
    question: "آیا این دوره فقط درباره نوشتن متن تبلیغاتی است؟",
    answer:
      "نه. متن تبلیغاتی فقط بخشی از دوره است. تمرکز اصلی روی طراحی پیام، پیشنهاد، سناریو، پیگیری و مسیر فروش است.",
  },
  {
    question: "آیا بعد از دوره می‌توانم کمپین طراحی کنم؟",
    answer:
      "هدف دوره این است که بتوانی برای یک محصول یا خدمت، یک مسیر کمپین ساده، هدفمند و قابل اجرا طراحی کنی. کیفیت نتیجه به تمرین و اجرای تو بستگی دارد.",
  },
  {
    question: "آیا درآمد خاصی تضمین می‌شود؟",
    answer:
      "خیر. این دوره مهارت و مسیر اجرا را آموزش می‌دهد، اما نتیجه مالی به تمرین، پیگیری، شرایط بازار و عملکرد فرد بستگی دارد.",
  },
  {
    question: "این دوره چه تفاوتی با کپی‌رایتینگ دارد؟",
    answer:
      "کپی‌رایتینگ بیشتر روی متن تمرکز دارد، اما کمپین‌نویسی فروش‌محور به مخاطب، پیشنهاد، پیام، سناریو، پیگیری و تبدیل توجه به اقدام نگاه می‌کند.",
  },
];

export default async function CourseCampaignWritingPage() {
  const priceLabel = `${formatFa(COURSE_PRICE)} تومان`;
  const heroAlt = await resolveMediaAlt(pageHeroBackdropPhoto, "دوره شغل کمپین‌نویسی آکادمی بهرام");

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip pb-20 md:pb-0">
      {/* 1. HERO */}
      <section className="relative isolate overflow-hidden bg-ink">
        <PageHeroBackdrop src={pageHeroBackdropPhoto} alt={heroAlt} priority />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-ink/50 via-ink/65 to-ink/80"
        />
        <div className="container-luxe relative z-[2] min-w-0 py-10 sm:py-14 md:py-20 lg:py-24">
          <div className="grid min-w-0 items-center gap-7 sm:gap-8 md:grid-cols-12 md:gap-10 lg:gap-16">
            <div className="min-w-0 text-center max-md:order-2 md:col-span-6 md:text-start">
              <Reveal>
                <Eyebrow>دوره شغل کمپین‌نویسی</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h1 className="mt-4 max-w-lg text-[clamp(1.875rem,7vw,2.75rem)] font-display leading-[1.15] text-balance md:mt-6 md:text-h1 lg:text-display">
                  کمپین بنویس؛
                  <br />
                  فروش بساز
                </h1>
              </Reveal>
              <Reveal delay={0.14}>
                <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-bone-dim sm:mt-5 md:mx-0 md:text-body">
                  یاد بگیر چطور برای یک محصول، پیام فروش‌ساز طراحی کنی و مخاطب را از توجه به
                  خرید نزدیک‌تر کنی.
                </p>
              </Reveal>

              <Reveal delay={0.2}>
                <div className="mx-auto mt-7 flex w-full flex-col gap-2.5 sm:mt-8 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-3 md:mx-0 md:justify-start">
                  <LinkButton
                    href="#enroll"
                    variant="sales"
                    size="lg"
                    withArrow
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                  >
                    شروع یادگیری کمپین‌نویسی
                  </LinkButton>
                  <LinkButton
                    href="#curriculum"
                    variant="ghost"
                    size="lg"
                    className={cn("w-full min-w-0 sm:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                  >
                    مشاهده سرفصل‌ها
                  </LinkButton>
                </div>
              </Reveal>

              <Reveal delay={0.3}>
                <p className="mt-4 text-sm text-bone-dim">
                  قیمت دوره:{" "}
                  <span className="font-semibold text-bone num-latin">{priceLabel}</span>
                </p>
              </Reveal>
            </div>

            <div className="min-w-0 max-md:order-1 md:col-span-6">
              <Reveal delay={0.12}>
                <HeroPhoto />
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 2. PROBLEM */}
      <ImageSplitSection
        eyebrow="مشکل اصلی"
        title="مشکل از نوشتن نیست؛ مشکل از نفروختن است"
        image={sitePhotos.manifestoLandscape}
        imageAlt="فضای کار کمپین‌نویسی"
        imagePosition="start"
        tone="gold"
      >
        <p>
          خیلی‌ها متن می‌نویسند، اما نمی‌دانند چطور مخاطب را به تصمیم نزدیک کنند. کمپین‌نویسی
          یعنی شناخت مخاطب، ساخت پیام درست و چیدن مسیر تا جایی که مخاطب آماده اقدام شود.
        </p>
        <ul className="mt-6 flex flex-wrap gap-2.5">
          {problemItems.map((item) => (
            <li
              key={item.title}
              className="inline-flex items-center gap-2 rounded-pill border border-bone/12 bg-charcoal/40 py-2 pe-4 ps-3 text-sm text-bone"
            >
              <item.icon className="h-4 w-4 text-gold" strokeWidth={1.6} aria-hidden />
              {item.title}
            </li>
          ))}
        </ul>
      </ImageSplitSection>

      {/* 3. WHAT IS CAMPAIGN WRITING */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>تعریف دقیق</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">کمپین‌نویسی دقیقاً یعنی چه؟</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                کمپین‌نویسی یعنی طراحی مسیر قانع‌سازی؛ از شناخت مخاطب تا رساندنش به اقدام.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="mt-8 overflow-x-auto md:mt-12">
              <div className="flex min-w-max items-center gap-2 md:min-w-0 md:flex-wrap md:justify-center md:gap-3">
                {flowSteps.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2 md:gap-3">
                    <div className="flex w-[5.5rem] flex-col items-center gap-2.5 text-center sm:w-24">
                      <IconTile icon={step.icon} tone={i % 2 === 0 ? "emerald" : "gold"} size="md" />
                      <span className="text-xs font-medium leading-snug text-bone sm:text-sm">
                        {step.label}
                      </span>
                    </div>
                    {i < flowSteps.length - 1 ? (
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 shrink-0 text-mist"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 4. OUTCOMES */}
      <ImageSplitSection
        eyebrow="خروجی دوره"
        title="بعد از این دوره چه چیزی بلد می‌شوی؟"
        image={sitePhotos.academyStory}
        imageAlt="خروجی یادگیری کمپین‌نویسی"
        imagePosition="end"
        tone="emerald"
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

      {/* 5. CURRICULUM */}
      <section id="curriculum" className="scroll-mt-20 py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <Reveal>
                <Eyebrow>سرفصل‌ها</Eyebrow>
              </Reveal>
              <Reveal delay={0.08}>
                <h2 className="mt-3 max-w-2xl text-h2 text-balance md:mt-5">مسیر یادگیری دوره</h2>
              </Reveal>
            </div>
            <Reveal delay={0.12}>
              <span className="text-sm text-gold num-latin">
                {toPersianDigits(String(CURRICULUM_LENGTH))} فصل
              </span>
            </Reveal>
          </div>

          <div className="mt-6 md:mt-9">
            <Reveal delay={0.1}>
              <Accordion
                items={curriculum.map((chapter) => ({
                  question: chapter.title,
                  answer: chapter.body,
                }))}
              />
            </Reveal>
          </div>
        </div>
      </section>

      {/* 6. DIFFERENCE */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>تفاوت اصلی</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                این دوره فقط کپی‌رایتینگ نیست
              </h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                تمرکز دوره روی اجرای واقعی است، نه فقط نوشتن متن زیبا.
              </p>
            </Reveal>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:mt-10 md:grid-cols-2 md:gap-6">
            <Reveal delay={0.1}>
              <article className="h-full rounded-card-lg border border-bone/10 bg-charcoal/30 p-5 sm:p-6">
                <p className="text-caption uppercase tracking-[0.22em] text-mist">
                  کپی‌رایتینگ سطحی
                </p>
                <ul className="mt-4 space-y-3">
                  {shallowCopywriting.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-bone/15 text-mist">
                        <X className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>

            <Reveal delay={0.16}>
              <article
                data-neon-tone="gold"
                className="neon-surface-framed relative h-full overflow-hidden rounded-card-lg border border-gold/35 bg-gradient-to-br from-gold/[0.08] via-charcoal/40 to-charcoal/30 p-5 sm:p-6"
              >
                <p className="text-caption uppercase tracking-[0.22em] text-gold">
                  کمپین‌نویسی فروش‌محور
                </p>
                <ul className="mt-4 space-y-3">
                  {salesCampaignWriting.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm font-medium text-bone">
                      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-gold/35 bg-gold/[0.12] text-gold">
                        <Check className="h-3.5 w-3.5" strokeWidth={1.8} aria-hidden />
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 7 & 8. WHO IS IT FOR / NOT FOR EVERYONE */}
      <ImageSplitSection
        eyebrow="مخاطب دوره"
        title="این دوره مناسب توست اگر…"
        image={sitePhotos.courseBackstage}
        imageAlt="پشت صحنه دوره کمپین‌نویسی"
        imagePosition="start"
        tone="emerald"
      >
        <ul className="space-y-3">
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

        <div className="mt-8 rounded-card border border-bone/10 bg-charcoal/30 p-4 sm:p-5">
          <p className="text-sm font-medium text-bone">این دوره برای همه نیست، برای تو ساخته شده اگر تمرین را جدی بگیری.</p>
          <ul className="mt-3 space-y-2.5">
            {notFor.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-bone-dim">
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mist" strokeWidth={1.6} aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </ImageSplitSection>

      {/* 9. PRACTICAL PATH */}
      <section id="path" className="scroll-mt-20 bg-obsidian py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="max-w-xl">
            <Reveal>
              <Eyebrow>مسیر اجرا</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">از یادگیری تا اجرا</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <p className="mt-4 text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                در پایان فقط اطلاعات نداری؛ یک کمپین ساده و قابل اجرا طراحی می‌کنی.
              </p>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="mt-8 overflow-x-auto md:mt-12">
              <div className="flex min-w-max items-center gap-2 md:min-w-0 md:flex-wrap md:justify-center md:gap-3">
                {practicalPath.map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2 md:gap-3">
                    <div className="flex w-[5.5rem] flex-col items-center gap-2.5 text-center sm:w-24">
                      <IconTile icon={step.icon} tone={i % 2 === 0 ? "gold" : "emerald"} size="md" />
                      <span className="text-xs font-medium leading-snug text-bone sm:text-sm">
                        {step.label}
                      </span>
                    </div>
                    {i < practicalPath.length - 1 ? (
                      <ArrowLeft
                        className="rtl-flip h-4 w-4 shrink-0 text-mist"
                        strokeWidth={1.6}
                        aria-hidden
                      />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 10. INSTRUCTOR / BRAND TRUST */}
      <section className="py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="grid items-center gap-6 sm:gap-8 md:grid-cols-12 md:gap-10 lg:gap-14">
            <div className="max-md:order-2 md:col-span-4">
              <Reveal>
                <PhotoFrame
                  ratio="square"
                  variant="radial"
                  rounded="card-lg"
                  src={sitePhotos.portraitFounder}
                  alt={site.founder}
                  label={site.founder}
                  className="mx-auto max-w-[14rem] border-bone/12 md:mx-0 md:max-w-none"
                  photoCaption="bottom"
                />
              </Reveal>
            </div>
            <div className="max-md:order-1 md:col-span-8">
              <Reveal delay={0.08}>
                <Eyebrow>اعتبار آموزش</Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h2 className="mt-3 text-h2 text-balance md:mt-5">
                  آموزش بر اساس تجربه واقعی فروش و کمپین
                </h2>
              </Reveal>
              <Reveal delay={0.16}>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-bone-dim md:mt-5 md:text-body">
                  محتوای دوره بر پایه اجرای واقعی کمپین و فروش طراحی شده؛ نه فقط تئوری کتابی.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="bg-obsidian py-10 md:py-section-sm">
        <div className="container-luxe min-w-0">
          <Reveal>
            <Eyebrow>سوالات متداول</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-3 max-w-3xl text-h2 text-balance md:mt-5">
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

      {/* PRICING / ENROLL */}
      <section id="enroll" className="scroll-mt-20 py-10 md:py-section-sm lg:py-section">
        <div className="container-luxe min-w-0">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <Eyebrow className="justify-center">ثبت‌نام</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-3 text-h2 text-balance md:mt-5">
                سرمایه‌گذاری روی مهارت فروش‌ساز
              </h2>
            </Reveal>
          </div>

          <div className="mt-8 md:mt-10">
            <Reveal delay={0.1}>
              <div className="mx-auto max-w-2xl">
                <EnrollCard priceLabel={priceLabel} />
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA */}
      <section className="bg-obsidian py-10 md:py-section-sm lg:py-section-xl">
        <div className="container-luxe min-w-0">
          <div className="neon-cta-slab relative overflow-hidden rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/40 via-charcoal/70 to-ink p-4 sm:p-8 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]"
            />
            <div className="relative flex flex-col items-center gap-5 text-center sm:gap-6 md:items-start md:text-start">
              <IconTile icon={Compass} tone="gold" size="lg" />
              <h2 className="max-w-2xl text-[clamp(1.25rem,5.5vw,1.75rem)] font-display leading-snug text-balance sm:text-h3 md:text-h2">
                آماده‌ای کمپین‌نویسی را جدی یاد بگیری؟
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-bone-dim md:text-body">
                اگر می‌خواهی فقط متن ننویسی و یاد بگیری چطور پیام فروش‌ساز طراحی کنی، این دوره
                نقطه شروع توست.
              </p>
              <div className="mt-1 flex w-full max-w-sm flex-col gap-2.5 sm:mt-2 md:max-w-none md:flex-row md:flex-wrap md:items-center md:gap-4">
                <AddToCartButton
                  productSlug={CAMPAIGN_WRITING_SLUG}
                  location="campaign_writing_final_cta"
                  variant="primary"
                  size="lg"
                  withArrow
                  className={cn("w-full min-w-0 md:w-auto", "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm")}
                >
                  شروع یادگیری کمپین‌نویسی
                </AddToCartButton>
                <a
                  href="#enroll"
                  className="inline-flex w-full items-center justify-center gap-2 py-2 text-sm text-gold transition-colors hover:text-gold-soft md:w-auto md:justify-start md:py-0"
                >
                  مشاهده قیمت
                  <ArrowLeft className="rtl-flip h-4 w-4 shrink-0" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <MobileStickyEnroll priceLabel={priceLabel} />
    </main>
  );
}

function HeroPhoto() {
  return (
    <div className="relative mx-auto w-full max-w-[min(100%,26rem)] sm:max-w-md md:mx-0 md:max-w-none">
      <PhotoFrame
        ratio="square"
        variant="radial"
        rounded="card-lg"
        src={sitePhotos.mainPathCampaign}
        alt="دوره شغل کمپین‌نویسی"
        neonTone="gold"
        interactive
        photoCaption="none"
        className="w-full"
      />
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

function EnrollCard({ priceLabel }: { priceLabel: string }) {
  return (
    <article
      data-neon-tone="emerald"
      className="neon-cta-slab relative overflow-hidden rounded-card-lg border border-emerald/40 bg-gradient-to-b from-emerald-deep/35 via-charcoal/65 to-ink p-5 sm:p-7 md:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_85%_5%,rgba(0,140,150,0.22),transparent_70%)]"
      />
      <div className="relative text-center">
        <Badge tone="emerald">دوره شغل کمپین‌نویسی</Badge>
        <p className="relative mt-5 break-words text-[clamp(1.25rem,5vw,1.875rem)] font-semibold leading-tight text-bone num-latin">
          {priceLabel}
        </p>
        <p className="mt-2 text-sm text-bone-dim md:text-base">
          مسیر کامل از پایه تا اجرا؛ شناخت مخاطب، پیام، پیشنهاد، سناریو و پیگیری.
        </p>
        <AddToCartButton
          productSlug={CAMPAIGN_WRITING_SLUG}
          location="campaign_writing_enroll"
          variant="sales"
          withArrow
          size="lg"
          className="relative mx-auto mt-7 w-full max-w-xs md:mt-8"
        >
          ثبت‌نام در دوره
        </AddToCartButton>
      </div>
    </article>
  );
}

function MobileStickyEnroll({ priceLabel }: { priceLabel: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-bone/10 bg-ink/95 px-4 py-3 backdrop-blur-md md:hidden">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs text-bone-dim">دوره شغل کمپین‌نویسی</p>
          <p className="text-sm font-semibold text-bone num-latin">{priceLabel}</p>
        </div>
        <AddToCartButton
          productSlug={CAMPAIGN_WRITING_SLUG}
          location="campaign_writing_mobile_bar"
          variant="sales"
          size="md"
          className="shrink-0"
        >
          ثبت‌نام
        </AddToCartButton>
      </div>
    </div>
  );
}
