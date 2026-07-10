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
  Quote,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
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
  { year: "۲۰۱۲", title: "آغاز تولید محتوا", body: "اولین گام‌ها در آموزش و مخاطب‌سازی." },
  { year: "۲۰۱۶", title: "اولین مسیر آموزشی", body: "دوره‌های ساختاری بازاریابی محتوا." },
  { year: "۲۰۱۹", title: "شکل‌گیری کمپین‌نویسی", body: "تجربه‌ها به نقشه‌ی ۱۰ فصل رسید." },
  { year: "۲۰۲۲", title: "۵۰٬۰۰۰+ دانشجو", body: "گسترش جامعه فارسی‌زبان روی همین مسیر." },
  { year: "۲۰۲۴", title: "تولد آکادمی", body: "اکوسیستم خصوصی برای رشد ساختاری." },
  { year: "۲۰۲۶", title: "اپ خصوصی آکادمی", body: "تجربه یکپارچه برای اعضا." },
];

export default async function FounderPage() {
  const heroAlt = await resolveMediaAlt(sitePhotos.portraitFounder, "بهرام رستمی");

  return (
    <main id="main-content" className="relative min-w-0 max-w-full overflow-x-clip">
      <section className="founder-hero relative isolate w-full overflow-hidden bg-ink">
        <div className="relative aspect-[16/9] w-full min-h-[min(62vw,16rem)] sm:min-h-[18rem] md:min-h-[22rem] lg:min-h-[min(42vw,28rem)]">
          <SiteImage
            src={sitePhotos.portraitFounder}
            alt={heroAlt}
            fallbackAlt="بهرام رستمی"
            fill
            priority
            className="object-cover object-[center_18%]"
            sizes="100vw"
          />
          <div aria-hidden className="photo-scrim-bottom-half" />
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center overflow-visible px-4 pb-6 pt-24 sm:pb-8 sm:pt-28 md:pb-10 md:pt-32">
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
        </div>
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
      <section className="bg-obsidian py-section-sm md:py-section">
        <div className="container-luxe">
          <div className="neon-surface-static mx-auto max-w-4xl rounded-card border border-bone/10 bg-charcoal/45 p-5 sm:p-8 md:p-12">
            <Reveal>
              <Eyebrow>نامه‌ای از من</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <Quote className="mt-4 h-6 w-6 text-gold/50 md:mt-6 md:h-8 md:w-8" strokeWidth={1.4} aria-hidden />
            </Reveal>
            <Reveal delay={0.12}>
              <h2 className="mt-3 text-h3 text-balance md:mt-4 md:text-h2">«آموزش بدون اجرا، سرگرمی است.»</h2>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-5 space-y-3 text-sm text-bone-dim md:mt-7 md:space-y-4 md:text-body">
                <p>
                  مشکل بازار کمبود اطلاعات نیست؛ کمبود ساختار و همراهی درست برای اجراست. کمپین‌نویسی و آکادمی برای همین ساخته
                  شده‌اند.
                </p>
                <p>
                  اگر این نگاه را دوست داری، از کمپین‌نویسی شروع کن؛ اگر بعداً عمق بیشتری خواستی، در آکادمی می‌بینمت.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="mt-6 flex flex-col items-start gap-3 border-t border-bone/8 pt-5 sm:flex-row sm:items-center sm:gap-5 md:mt-10 md:gap-6 md:pt-6">
                <SiteImage
                  src={siteStorageMedia('signature.svg')}
                  alt="امضای بهرام"
                  fallbackAlt="امضای بهرام"
                  width={200}
                  height={70}
                  wrapperClassName="leading-none"
                  className="max-w-[min(100%,11rem)] sm:max-w-none"
                />
                <span className="text-caption text-mist">بهرام</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* MILESTONES TIMELINE */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>نقاط مهم مسیر</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-4 max-w-3xl text-h2 text-balance md:mt-5">
              ده سال در یک خط.
            </h2>
          </Reveal>

          <ol
            className={
              "mt-8 space-y-5 md:relative md:mt-14 md:space-y-8 " +
              "md:before:absolute md:before:start-1/2 md:before:top-2 md:before:bottom-2 md:before:w-px md:before:-translate-x-px " +
              "md:before:bg-gradient-to-b md:before:from-gold/0 md:before:via-bone/10 md:before:to-gold/0"
            }
          >
            {milestones.map((m, i) => (
              <li key={m.year} className="relative">
                <Reveal delay={i * 0.05}>
                  <div className="grid gap-3 md:grid-cols-12 md:items-center md:gap-4">
                    <div
                      className={
                        "flex items-center gap-2 md:col-span-5 " +
                        (i % 2 === 0 ? "md:justify-end md:text-end" : "md:order-3 md:justify-start md:text-start")
                      }
                    >
                      <span
                        aria-hidden
                        className="inline-flex h-2 w-2 shrink-0 rounded-full bg-gold shadow-[0_0_12px_2px_rgba(255,176,0,0.55)] md:hidden"
                      />
                      <p className="font-display text-lg font-semibold num-latin text-gold md:text-h3">{m.year}</p>
                    </div>
                    <div className="hidden md:col-span-2 md:flex md:items-center md:justify-center">
                      <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-pill bg-charcoal ring-1 ring-gold/40">
                        <span className="h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_12px_2px_rgba(255,176,0,0.55)]" />
                      </span>
                    </div>
                    <div className={`md:col-span-5 ${i % 2 === 0 ? "" : "md:order-1 md:text-end"}`}>
                      <article className="neon-surface-hover rounded-card border border-bone/10 bg-charcoal/45 p-4 md:p-5">
                        <p className="text-lg font-semibold text-bone md:text-h3">{m.title}</p>
                        <p className="mt-1.5 text-sm text-bone-dim md:mt-2 md:text-base">{m.body}</p>
                      </article>
                    </div>
                  </div>
                </Reveal>
              </li>
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
