import type { Metadata } from "next";
import type { ReactNode } from "react";
import { buildMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Layers,
  Phone,
  Target,
  TrendingUp,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { AcademyAppScreensShowcase } from "@/components/sections/AcademyAppScreensShowcase";
import { SatFlowScroll, type SatFlowStep } from "@/components/sections/SatFlowScroll";
import { SatWapScroll, type SatWapPillar } from "@/components/sections/SatWapScroll";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconLabel } from "@/components/ui/IconLabel";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { sitePhotos } from "@/lib/site-photo-paths";

const WAP_PRICE = 200_000_000;

export const metadata: Metadata = buildMetadata({
  title: "سات · سیستم عملیاتی فروش",
  description:
    "سات؛ سیستم عملیاتی فروش. از آموزش تا تماس، از تماس تا کمیسیون — مسیر WAP.",
  path: "/saat",
});

const flowSteps: SatFlowStep[] = [
  {
    icon: "graduation-cap",
    title: "آموزش",
    caption: "کمپین‌نویسی و فروش تلفنی",
    description: "دوره را می‌بینی و قبل از تماس، برای اجرا آماده می‌شوی.",
    image: sitePhotos.courseBackstage,
    alt: "آموزش کمپین‌نویسی",
  },
  {
    icon: "users",
    title: "لید",
    caption: "سرنخ واقعی در پنل سات",
    description: "لید واقعی وارد سیستم می‌شود؛ هر سرنخ یک مسیر مشخص دارد.",
    image: sitePhotos.storyStep[0]!,
    alt: "دریافت لید",
  },
  {
    icon: "phone",
    title: "تماس",
    caption: "تماس با سناریوی آماده",
    description: "با سناریوی آماده تماس می‌گیری؛ می‌دانی چه بگویی و از کجا شروع کنی.",
    image: sitePhotos.landscapeSession,
    alt: "تماس با مخاطب",
  },
  {
    icon: "target",
    title: "فیدبک",
    caption: "ثبت نتیجه تماس",
    description: "نتیجه هر تماس ثبت می‌شود؛ هیچ فرصت فروشی گم نمی‌شود.",
    image: sitePhotos.storyStep[1]!,
    alt: "ثبت فیدبک",
  },
  {
    icon: "trending-up",
    title: "پیگیری",
    caption: "قدم بعدی مشخص",
    description: "زمان و مسیر پیگیری بعدی روشن می‌شود؛ تصمیم مخاطب ادامه دارد.",
    image: sitePhotos.storyStep[2]!,
    alt: "پیگیری لید",
  },
  {
    icon: "smartphone",
    title: "فروش",
    caption: "ثبت و تایید فروش",
    description: "فروش موفق ثبت و برای تایید ارسال می‌شود.",
    image: sitePhotos.squareBackstage,
    alt: "ثبت فروش",
  },
  {
    icon: "wallet",
    title: "کمیسیون",
    caption: "درآمد در کیف پول",
    description: "درآمد بر اساس فروش تاییدشده محاسبه و در کیف پول نمایش داده می‌شود.",
    image: sitePhotos.storyStep[3]!,
    alt: "کمیسیون و درآمد",
  },
];

const wapPillars: SatWapPillar[] = [
  {
    icon: "book-open",
    tag: "آموزش",
    title: "یادگیری قبل از اجرا",
    description: "کمپین‌نویسی، فروش تلفنی و سناریونویسی — پایه‌ی ورود به میدان فروش.",
    image: sitePhotos.courseBackstage,
    alt: "آموزش کمپین‌نویسی",
    chips: ["کمپین‌نویسی", "فروش تلفنی", "سناریونویسی"],
  },
  {
    icon: "smartphone",
    tag: "اجرا",
    title: "سیستم عملیاتی سات",
    description: "لید، تماس، فیدبک و پیگیری در یک سیستم — جایی که آموزش وارد عمل می‌شود.",
    image: sitePhotos.academyStory,
    alt: "مینی‌اپ سات",
    chips: ["لید", "تماس", "فیدبک", "پیگیری"],
  },
  {
    icon: "network",
    tag: "شبکه",
    title: "فروش و درآمد",
    description: "ورود به شبکه فروش، مسیر کمیسیون و ارزیابی عملکرد واقعی.",
    image: sitePhotos.manifestoLandscape,
    alt: "شبکه فروش",
    chips: ["شبکه فروش", "کمیسیون", "ارزیابی"],
  },
];

const showcaseItems = [
  {
    src: sitePhotos.academyAppHome,
    title: "داشبورد",
    note: "عملکرد روزانه در یک نگاه.",
    label: "داشبورد",
  },
  {
    src: sitePhotos.academyAppPath,
    title: "لیدها",
    note: "هر سرنخ، مسیر مشخص.",
    label: "لیدها",
  },
  {
    src: sitePhotos.academyAppAtelier,
    title: "فروش",
    note: "ثبت فروش و کیف پول.",
    label: "فروش",
  },
];

const whoFor = [
  {
    icon: Target,
    title: "فروش را جدی می‌گیرند",
    body: "می‌خواهند وارد دنیای فروش، کمپین‌نویسی و تماس هدفمند شوند.",
    image: sitePhotos.social[0]!,
  },
  {
    icon: BookOpen,
    title: "بعد از آموزش، اجرا",
    body: "از دوره‌های تئوری خسته شده‌اند و دنبال مسیر عملی هستند.",
    image: sitePhotos.social[1]!,
  },
  {
    icon: Phone,
    title: "تماس و پیگیری مستمر",
    body: "توانایی یادگیری، تماس و پیگیری منظم دارند.",
    image: sitePhotos.social[2]!,
  },
  {
    icon: Layers,
    title: "مسیر ساختاریافته",
    body: "دنبال ساختار جدی فروش هستند، نه فقط یک دوره ساده.",
    image: sitePhotos.social[3]!,
  },
];

export default function SaatPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* Hero */}
      <section
        aria-labelledby="saat-hero-heading"
        className="relative isolate overflow-hidden border-b border-gold/15 bg-ink shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-gold)_18%,transparent)]"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_100%_-5%,color-mix(in_oklab,var(--color-gold)_24%,transparent),transparent_62%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_42%_at_0%_100%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_70%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/[0.08] via-transparent to-ink" />

        <div className="container-luxe relative z-[2] py-section-sm md:py-section">
          <div className="grid items-center gap-8 md:grid-cols-12 md:gap-12 lg:gap-14">
            <div className="md:col-span-6 lg:col-span-5">
              <Reveal>
                <Badge tone="gold" className="mb-4 border-gold/35 bg-gold/[0.08] md:mb-6">
                  {site.saat.eyebrow}
                </Badge>
              </Reveal>
              <Reveal delay={0.1}>
                <h1
                  id="saat-hero-heading"
                  className="bg-gradient-to-l from-bone via-gold-soft to-bone bg-clip-text text-h2 text-balance text-transparent md:text-h1"
                >
                  سات؛ سیستم عملیاتی فروش
                </h1>
              </Reveal>
              <Reveal delay={0.18}>
                <p className="mt-4 max-w-md text-body text-bone-dim md:mt-6">
                  از آموزش تا تماس، از تماس تا فروش.
                </p>
              </Reveal>
              <Reveal delay={0.26}>
                <div className="mt-6 flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:flex-wrap md:mt-9 md:gap-3">
                  <LinkButton href="/apply" variant="vip" size="lg" withArrow className="w-full sm:w-auto">
                    بررسی شرایط ورود
                  </LinkButton>
                  <LinkButton
                    href="/saat#showcase"
                    variant="ghost"
                    size="lg"
                    className="w-full border-gold/22 sm:w-auto hover:border-gold/40 hover:bg-gold/[0.06]"
                  >
                    دیدن سات
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.34}>
                <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-gold/15 pt-4 md:mt-10 md:pt-5">
                  <IconLabel icon={Phone} tone="gold">
                    هر تماس، یک فرصت
                  </IconLabel>
                  <IconLabel icon={TrendingUp} tone="gold">
                    فروش قابل پیگیری
                  </IconLabel>
                </div>
              </Reveal>
            </div>

            <div className="md:col-span-6 lg:col-span-7">
              <Reveal delay={0.14}>
                <div className="relative mx-auto max-w-lg md:ms-auto md:me-0">
                  <PhotoFrame
                    ratio="landscape"
                    variant="radial"
                    rounded="card-lg"
                    label="پیش‌نمایش سات"
                    badge="سات"
                    className="border-gold/25 shadow-black/35 neon-surface-framed ring-1 ring-gold/18"
                    src={sitePhotos.academyStory}
                    alt="پیش‌نمایش مینی‌اپ سات"
                    photoCaption="none"
                    priority
                  />
                  <div className="pointer-events-none absolute -bottom-4 -start-3 z-[3] hidden w-32 rotate-[-3deg] sm:block md:-start-6 md:w-40">
                    <PhotoFrame
                      ratio="square"
                      variant="soft"
                      rounded="card"
                      className="border-gold/22 shadow-xl shadow-black/45"
                      showIcon={false}
                      src={sitePhotos.academyAccent}
                      alt="فضای تیم فروش"
                      photoCaption="none"
                    />
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* مشکل مخاطب — تصویرمحور */}
      <VisualSplitSection
        eyebrow="مشکل واقعی"
        title="مشکل از اجراست"
        image={sitePhotos.manifestoLandscape}
        imageAlt="فاصله بین آموزش و اجرا"
        imagePosition="end"
        className="border-t border-gold/12 bg-obsidian"
        bodyClassName="text-base leading-relaxed md:text-lg"
      >
        <p className="text-bone-dim">
          خیلی‌ها آموزش می‌بینند، اما بعدش تنها می‌مانند — بدون لید، سناریو و مسیر پیگیری.
        </p>
        <p className="mt-4 font-medium text-bone">سات مسیر بعد از آموزش را واضح می‌کند.</p>
      </VisualSplitSection>

      {/* مسیر کاربر — اسکرول‌درایون */}
      <SatFlowScroll steps={flowSteps} />

      {/* نگاهی به سات */}
      <section
        id="showcase"
        className="relative isolate overflow-hidden border-t border-gold/15 bg-ink py-section scroll-mt-20"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,color-mix(in_oklab,var(--color-gold)_12%,transparent),transparent_58%)]" />
        <div className="container-luxe relative">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
              از نزدیک
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 text-h2 text-bone">نگاهی به سات</h2>
          </Reveal>

          <AcademyAppScreensShowcase
            variant="gold"
            items={showcaseItems.map(({ src, title, note, label }) => ({
              src,
              title,
              note,
              label,
              alt: title,
            }))}
          />
        </div>
      </section>

      {/* مسیر WAP — اسکرول‌درایون و المان‌محور */}
      <SatWapScroll pillars={wapPillars} price={WAP_PRICE} />

      {/* سات فقط اپ نیست */}
      <VisualSplitSection
        eyebrow="فراتر از اپ"
        title="سات فقط یک اپلیکیشن نیست"
        image={sitePhotos.academyAccent}
        imageAlt="سیستم فروش ساختاریافته"
        imagePosition="start"
        className="border-t border-gold/12 bg-ink"
      >
        <p className="text-bone-dim">
          سات کمک می‌کند بدانی با هر لید چه کرده‌ای، کدام تماس نیاز به پیگیری دارد و عملکردت کجاست.
        </p>
        <p className="mt-4 font-medium text-gold">سات یعنی فروش، اما ساختاریافته.</p>
      </VisualSplitSection>

      {/* مخاطب — کارت تصویری */}
      <section className="border-t border-gold/10 bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
              مخاطب سات
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 text-h2 text-bone">برای چه کسانی؟</h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 max-w-xl text-sm text-bone-dim">
              سات برای کسی است که می‌خواهد آموزش را در یک سیستم واقعی اجرا کند — نه فقط یاد بگیرد
              و تنها بماند.
            </p>
          </Reveal>
          <div className="mt-6 grid min-w-0 grid-cols-2 gap-3 sm:gap-5 md:mt-10 md:gap-6">
            {whoFor.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.05}>
                <WhoForCard {...item} tone={i % 2 === 0 ? "gold" : "emerald"} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* سات برای همه نیست */}
      <section className="border-t border-gold/12 bg-ink py-section-sm">
        <div className="container-luxe">
          <div className="grid items-center gap-6 md:grid-cols-12 md:gap-10">
            <Reveal className="md:col-span-5">
              <PhotoFrame
                ratio="landscape"
                variant="grid"
                rounded="card-lg"
                label="مسیر جدی"
                src={sitePhotos.squareBackstage}
                alt="مسیر فروش حرفه‌ای"
                className="border-gold/20"
              />
            </Reveal>
            <Reveal delay={0.08} className="md:col-span-7">
              <IconTile icon={Layers} tone="gold" size="lg" />
              <h2 className="mt-5 text-h3 text-bone md:text-h2">سات برای همه نیست</h2>
              <p className="mt-4 max-w-xl text-sm text-bone-dim md:text-base">
                برای کسی که فروش را جدی می‌گیرد — نه برای تماشای یک دوره ساده.
              </p>
              <LinkButton href="/apply" variant="vip" size="md" withArrow className="mt-6">
                درخواست مشاوره ورود
              </LinkButton>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative isolate overflow-hidden border-t border-gold/15 bg-obsidian py-section">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_85%_15%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_65%)]" />
        <div className="container-luxe relative">
          <div
            data-neon-tone="gold"
            className="neon-cta-slab relative overflow-hidden rounded-card border border-gold/28 bg-gradient-to-b from-ink via-charcoal/65 to-ink p-5 sm:p-8 md:p-12"
          >
            <div className="relative grid items-center gap-6 md:grid-cols-12 md:gap-10">
              <div className="md:col-span-7">
                <IconTile icon={Compass} tone="gold" size="lg" />
                <h2 className="mt-5 text-h3 text-bone md:mt-6 md:text-h2">آماده ورود به مسیر سات؟</h2>
                <p className="mt-3 max-w-lg text-sm text-bone-dim md:text-base">
                  کمپین‌نویسی را در یک سیستم واقعی اجرا کن.
                </p>
                <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
                  <LinkButton href="/apply" variant="sales" size="lg" withArrow className="w-full sm:w-auto">
                    درخواست مشاوره
                  </LinkButton>
                  <Link
                    href="/saat#wap"
                    className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                  >
                    مسیر WAP
                    <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
              <div className="md:col-span-5">
                <PhotoFrame
                  ratio="square"
                  variant="soft"
                  rounded="card-lg"
                  showIcon={false}
                  src={sitePhotos.ctaSquare}
                  alt="شروع مسیر سات"
                  photoCaption="none"
                  className="border-gold/20"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function VisualSplitSection({
  eyebrow,
  title,
  image,
  imageAlt,
  imagePosition = "start",
  className,
  bodyClassName,
  children,
}: {
  eyebrow: string;
  title: string;
  image: string;
  imageAlt: string;
  imagePosition?: "start" | "end";
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const imageFirst = imagePosition === "start";

  return (
    <section className={cn("py-10 md:py-section-sm lg:py-section", className)}>
      <div className="container-luxe min-w-0">
        <div
          className={cn(
            "grid items-center gap-5 sm:gap-6 md:grid-cols-12 md:gap-10 lg:gap-12",
            !imageFirst && "md:[&>div:first-child]:order-2 md:[&>div:last-child]:order-1",
          )}
        >
          <Reveal className="md:col-span-5 lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-card-lg border border-bone/10">
              <Image src={image} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 45vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent" />
            </div>
          </Reveal>
          <div className="md:col-span-7 lg:col-span-6">
            <Reveal>
              <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
                {eyebrow}
              </Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-4 text-h2 text-balance text-bone md:mt-5">{title}</h2>
            </Reveal>
            <Reveal delay={0.14}>
              <div className={cn("mt-4 max-w-lg text-sm md:text-base", bodyClassName)}>{children}</div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function WhoForCard({
  icon: Icon,
  title,
  body,
  image,
  tone,
}: {
  icon: typeof Target;
  title: string;
  body: string;
  image: string;
  tone: "emerald" | "gold";
}) {
  return (
    <article className="group relative aspect-[8/5] w-full overflow-hidden rounded-card-lg border border-bone/10">
      <Image
        src={image}
        alt=""
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="(max-width: 640px) 50vw, 25vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/20" />
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 opacity-50",
          tone === "gold"
            ? "bg-gradient-to-br from-gold/25 via-transparent to-transparent"
            : "bg-gradient-to-br from-emerald-glow/20 via-transparent to-transparent",
        )}
      />
      <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4 md:p-5">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-pill border border-bone/15 bg-ink/50 text-gold backdrop-blur-sm">
          <Icon className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
        </span>
        <p className="mt-2 text-sm font-medium leading-snug text-bone sm:text-base">{title}</p>
        <p className="mt-1 text-xs leading-relaxed text-bone-dim sm:text-sm">{body}</p>
      </div>
    </article>
  );
}
