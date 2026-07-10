import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  GraduationCap,
  HandHeart,
  Lightbulb,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
import { SitePhotoHeroFrame } from "@/components/sections/SitePhotoHeroFrame";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";
import { resolveMediaAlt } from "@/lib/media/alt";
import { sitePhotos } from "@/lib/site-photo-paths";
import { siteStorageMedia } from "@/config/media";

export const metadata: Metadata = buildMetadata({
  title: "بهرام رستمی · امپراطوری فروش",
  description: "فلسفه و مسیر بهرام رستمی؛ بنیان‌گذار آکادمی و مدرس کمپین‌نویسی.",
  path: "/founder",
  type: "profile",
});

const philosophy = [
  {
    icon: Compass,
    title: "نگاه، پیش از تاکتیک",
    body: "بدون نگاه روشن، تاکتیک جواب نمی‌دهد.",
  },
  {
    icon: Rocket,
    title: "اجرا، پیش از کمال",
    body: "بهترین درس از اجرای ناقص است نه مطالعه‌ی بی‌پایان.",
  },
  {
    icon: HandHeart,
    title: "هویت، پیش از مهارت",
    body: "مهارت عوض می‌شود؛ هویت تو را در مسیر نگه می‌دارد.",
  },
  {
    icon: Sparkles,
    title: "ساختار، پیش از انگیزه",
    body: "ساختار نتیجه می‌دهد؛ انگیزه فقط استارت است.",
  },
];

const milestones = [
  { year: "۲۰۱۲", title: "آغاز تولید محتوا" },
  { year: "۲۰۱۶", title: "اولین مسیر آموزشی" },
  { year: "۲۰۱۹", title: "شکل‌گیری کمپین‌نویسی" },
  { year: "۲۰۲۲", title: "۵۰٬۰۰۰+ دانشجو" },
  { year: "۲۰۲۴", title: "تولد آکادمی" },
  { year: "۲۰۲۶", title: "اپ خصوصی آکادمی" },
];

export default async function FounderPage() {
  const heroAlt = await resolveMediaAlt(sitePhotos.portraitFounder, "بهرام رستمی");
  const heroMobileAlt = await resolveMediaAlt(sitePhotos.portraitFounderMobile, "بهرام رستمی");

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip">
      <section className="founder-hero relative isolate w-full overflow-hidden bg-ink">
        <SitePhotoHeroFrame
          desktopSrc={sitePhotos.portraitFounder}
          mobileSrc={sitePhotos.portraitFounderMobile}
          desktopAlt={heroAlt}
          mobileAlt={heroMobileAlt}
          desktopImageClassName="object-[center_18%]"
        >
          <div className="absolute inset-x-0 bottom-6 z-10 flex flex-col items-center overflow-visible px-4 pb-8 pt-16 sm:bottom-4 sm:pb-7 sm:pt-24 md:bottom-0 md:pb-8 md:pt-28">
            <div className="founder-hero-headline-outer">
              <div className="founder-hero-headline-wrap">
                <h1 className="founder-hero-headline">
                  <span className="founder-hero-title">بهرام رستمی</span>
                  <span className="founder-hero-tagline">امپراطوری فروش</span>
                </h1>
              </div>
            </div>
            <div className="flex w-full max-w-lg flex-col gap-3 sm:max-w-xl sm:flex-row sm:items-stretch sm:justify-center md:max-w-2xl md:gap-4">
              <LinkButton
                href="/course/campaign-writing"
                variant="vip"
                size="lg"
                withArrow
                className="h-12 min-h-12 w-full px-8 text-base font-bold shadow-gold sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14 md:px-10 md:text-lg"
              >
                شروع مسیر با کمپین‌نویسی
              </LinkButton>
              <LinkButton
                href="/saat"
                variant="ghost"
                size="lg"
                withArrow
                className={cn(
                  "h-12 min-h-12 w-full border-white/25 bg-black/30 text-white backdrop-blur-md",
                  "hover:border-white/40 hover:bg-white/10 hover:text-white",
                  "sm:flex-1 sm:max-w-xs md:h-14 md:min-h-14",
                )}
              >
                آشنایی با سات
              </LinkButton>
            </div>
          </div>
        </SitePhotoHeroFrame>
      </section>

      <section className="founder-hero-stats bg-ink py-6 md:py-8">
        <div className="container-luxe">
          <Reveal>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 md:gap-x-10">
              <IconLabel icon={Users} tone="bone">
                ۷۰۰٬۰۰۰+ مخاطب
              </IconLabel>
              <IconLabel icon={GraduationCap} tone="emerald">
                ۵۰٬۰۰۰+ دانشجو
              </IconLabel>
              <IconLabel icon={Sparkles} tone="gold">
                ۱۰+ سال تجربه
              </IconLabel>
            </div>
          </Reveal>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>فلسفه</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              چهار اصل کار من.
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {philosophy.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <FeatureCard
                  icon={p.icon}
                  title={p.title}
                  description={p.body}
                  tone={i === 2 ? "gold" : "emerald"}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PERSONAL LETTER */}
      <section className="founder-letter bg-obsidian py-section-sm md:py-section">
        <div className="container-luxe">
          <Reveal>
            <article className="founder-letter-card relative mx-auto max-w-4xl overflow-hidden rounded-card-lg border border-bone/10">
              <div className="relative aspect-[4/5] min-h-[28rem] w-full sm:aspect-[16/11] sm:min-h-[24rem] md:aspect-[16/10] md:min-h-[26rem]">
                <SiteImage
                  src={sitePhotos.portraitFounder}
                  alt={heroAlt}
                  fallbackAlt="بهرام رستمی"
                  fill
                  className="object-cover object-[center_14%]"
                  sizes="(max-width: 896px) 100vw, 896px"
                />
                <div aria-hidden className="founder-letter-scrim" />
                <div className="founder-letter-content absolute inset-0 z-10 flex flex-col justify-end p-6 sm:p-8 md:p-10">
                  <p className="founder-letter-eyebrow text-caption uppercase tracking-[0.16em]">نامه‌ای از من</p>
                  <h2 className="founder-letter-quote mt-3 max-w-2xl font-display text-h3 text-balance md:mt-4 md:text-h2">
                    «آموزش بدون اجرا، سرگرمی است.»
                  </h2>
                  <div className="founder-letter-body mt-4 max-w-2xl space-y-3 text-sm leading-relaxed md:mt-6 md:space-y-3.5 md:text-base">
                    <p>
                      مشکل بازار کمبود اطلاعات نیست؛ کمبود ساختار و همراهی درست برای اجراست. کمپین‌نویسی و آکادمی برای همین
                      ساخته شده‌اند.
                    </p>
                    <p>
                      اگر این نگاه را دوست داری، از کمپین‌نویسی شروع کن؛ اگر بعداً عمق بیشتری خواستی، در آکادمی می‌بینمت.
                    </p>
                  </div>
                  <div className="founder-letter-sign mt-6 flex items-center gap-4 border-t border-white/12 pt-5 md:mt-8 md:pt-6">
                    <SiteImage
                      src={siteStorageMedia("signature.svg")}
                      alt="امضای بهرام"
                      fallbackAlt="امضای بهرام"
                      width={200}
                      height={70}
                      wrapperClassName="founder-letter-sign__mark leading-none"
                      className="max-w-[min(100%,10.5rem)]"
                    />
                    <span className="founder-letter-sign__name text-caption">بهرام</span>
                  </div>
                </div>
              </div>
            </article>
          </Reveal>
        </div>
      </section>

      <section className="founder-milestones py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <p className="text-caption uppercase tracking-[0.16em] text-mist">نقاط مهم مسیر</p>
              <h2 className="mt-2 font-display text-h3 text-bone md:text-h2">ده سال در یک خط</h2>
            </div>
          </Reveal>

          <ol className="founder-milestones__list mx-auto mt-8 max-w-2xl md:mt-10">
            {milestones.map((m, i) => (
              <Reveal key={m.year} delay={i * 0.03}>
                <li className="founder-milestones__item flex items-center justify-between gap-4 py-3.5 md:py-4">
                  <span className="min-w-0 text-start text-sm text-bone md:text-base">{m.title}</span>
                  <span className="founder-milestones__rule hidden flex-1 md:block" aria-hidden />
                  <span className="founder-milestones__year shrink-0 text-end font-display text-sm font-semibold text-gold num-latin md:text-base">
                    {m.year}
                  </span>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* SIGNATURE WORKS */}
      <section className="bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>آثار شاخص</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              کارهای اصلی این سال‌ها.
            </h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-3">
            {[
              { icon: BookOpen, title: "کمپین‌نویسی", body: "۱۰ فصل ساختاری." },
              { icon: Sparkles, title: "آکادمی", body: "اکوسیستم خصوصی رشد." },
              { icon: Lightbulb, title: "نشست‌های زنده", body: "نشست‌های تخصصی برای جامعه." },
            ].map((w, i) => (
              <Reveal key={w.title} delay={i * 0.07}>
                <FeatureCard icon={w.icon} title={w.title} description={w.body} tone={i === 1 ? "gold" : "emerald"} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="founder-cta-band" aria-labelledby="founder-cta-heading">
        <div className="founder-cta-band__surface relative overflow-hidden py-12 sm:py-14 md:py-16 lg:py-20">
          <div aria-hidden className="founder-cta-band__ambient pointer-events-none absolute inset-0" />
          <div className="container-luxe relative z-[1]">
            <Reveal>
              <div className="founder-cta-band__inner mx-auto max-w-3xl text-center md:max-w-4xl">
                <h2
                  id="founder-cta-heading"
                  className="founder-cta-band__title font-display text-h2 text-balance md:text-display"
                >
                  اگر این نگاه با تو هم‌خوان است،
                  <span className="mt-2 block text-[0.92em] font-bold">قدم بعدی را بردار.</span>
                </h2>
                <p className="founder-cta-band__lead mx-auto mt-4 max-w-2xl text-sm leading-relaxed md:mt-6 md:text-base">
                  از کمپین‌نویسی شروع کن؛ مسیر بعدی خودش روشن می‌شود.
                </p>
                <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center md:mt-10">
                  <LinkButton
                    href="/course/campaign-writing"
                    variant="primary"
                    size="lg"
                    withArrow
                    className="founder-cta-band__primary h-12 min-h-12 w-full sm:max-w-[14rem]"
                  >
                    شروع مسیر
                  </LinkButton>
                  <Link
                    href="/insights"
                    className="founder-cta-band__secondary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill border px-6 text-sm font-semibold transition-colors sm:max-w-[14rem]"
                  >
                    رفتن به بلاگ
                    <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </main>
  );
}
