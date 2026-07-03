import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowLeft,
  Compass,
  Eye,
  GitBranch,
  GraduationCap,
  HandHeart,
  Lock,
  MessagesSquare,
  Sparkles,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { AcademyAppScreensShowcase } from "@/components/sections/AcademyAppScreensShowcase";
import { WhyDifferent } from "@/components/sections/WhyDifferent";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "آکادمی · اکوسیستم خصوصی رشد",
  description: "آموزش عمیق، اتاق رشد، منتورینگ، اپ خصوصی؛ ورود با ارزیابی.",
  path: "/academy",
});

const pillars = [
  {
    icon: GraduationCap,
    title: "آکادمی خصوصی",
    body: "مسیرهای پیشرفته فقط برای اعضا.",
  },
  {
    icon: Workflow,
    title: "اتاق رشد",
    body: "اجرا، شاخص هفتگی، بازخورد ساختاری.",
  },
  {
    icon: HandHeart,
    title: "منتورینگ",
    body: "همراهی نزدیک برای اعضای تأییدشده.",
  },
  {
    icon: Sparkles,
    title: "اپ خصوصی",
    body: "مسیر، صدای روزانه، سند هویت در یک جا.",
  },
];

const benefits = [
  { icon: MessagesSquare, title: "خط مستقیم تیم", body: "پاسخ برای هر گام مهم." },
  { icon: GitBranch, title: "مسیر شخصی", body: "فصل‌ها و تمرین‌ها متناسب با تو." },
  { icon: ShieldCheck, title: "فضای امن", body: "خارج از فضای عمومی شبکه‌ها." },
  { icon: Eye, title: "نگاه استراتژیک", body: "تحلیل‌ها مختص اعضا." },
];

const appShowcase = [
  {
    src: sitePhotos.academyAppHome,
    title: "خانه — صبحِ تو",
    note: "صدای روزانه + گام بعدی + اتاق رشد",
    label: "خانه",
  },
  {
    src: sitePhotos.academyAppPath,
    title: "مسیر — Path",
    note: "۱۰ فصل از کمپین‌نویسی + پیشرفت",
    label: "مسیر",
  },
  {
    src: sitePhotos.academyAppAtelier,
    title: "اتاق رشد — Atelier",
    note: "تیم، شاخص‌ها و خط مستقیم",
    label: "اتاق رشد",
  },
];

export default function AcademyPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* HERO — همان زبان بصری تیزر طلایی صفحه‌ی اصلی */}
      <section
        aria-labelledby="academy-hero-heading"
        className="relative isolate overflow-hidden border-b border-gold/15 bg-ink shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-gold)_18%,transparent)]"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_55%_at_100%_-5%,color-mix(in_oklab,var(--color-gold)_24%,transparent),transparent_62%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_42%_at_0%_100%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold/[0.08] via-transparent to-ink"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/40 to-transparent"
        />

        <div className="container-luxe relative z-[2] py-section-sm md:py-section">
          <div className="grid items-center gap-8 md:grid-cols-12 md:gap-12 lg:gap-14">
            <div className="md:col-span-7">
              <Reveal>
                <Badge tone="gold" className="mb-4 border-gold/35 bg-gold/[0.08] shadow-sm shadow-black/15 md:mb-6">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  آکادمی طلایی · VIP
                </Badge>
              </Reveal>
              <Reveal delay={0.06}>
                <Eyebrow className="rounded-pill border border-gold/35 bg-gold/[0.08] px-4 py-2 shadow-sm shadow-black/20 backdrop-blur-sm">
                  اکوسیستم خصوصی
                </Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h1
                  id="academy-hero-heading"
                  className="mt-4 max-w-full min-w-0 bg-gradient-to-l from-bone via-gold-soft to-bone bg-clip-text text-h1 text-balance text-transparent md:mt-6 md:text-display"
                >
                  آکادمی — جایی برای کسانی
                  <br />
                  که مسیر را جدی می‌گیرند.
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim md:mt-7 md:text-lg">
                  آموزش، اجرا، مربی‌گری و پشتیبانی در یک محیط واحد — نه تک‌ابزار پراکنده.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-6 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-4">
                  <LinkButton href="/apply" variant="vip" size="lg" withArrow>
                    درخواست ارزیابی
                  </LinkButton>
                  <LinkButton
                    href="/academy/app"
                    variant="ghost"
                    size="lg"
                    className="border-gold/22 hover:border-gold/40 hover:bg-gold/[0.06]"
                  >
                    دیدنِ اپ خصوصی
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.36}>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 border-t border-gold/15 pt-4 md:mt-12 md:gap-x-7 md:gap-y-3 md:pt-6">
                  <IconLabel icon={Lock} tone="gold">
                    ورود انتخابی
                  </IconLabel>
                  <IconLabel icon={Users} tone="gold">
                    جامعه‌ی محدود
                  </IconLabel>
                  <IconLabel icon={ShieldCheck} tone="gold">
                    فضای امن خصوصی
                  </IconLabel>
                </div>
              </Reveal>
            </div>

            <div className="md:col-span-5">
              <Reveal delay={0.2}>
                <div className="relative mx-auto w-full max-w-md pb-3 pt-4 md:ms-auto md:me-0 md:pb-4 md:pt-6">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -end-2 top-16 hidden h-24 w-24 rounded-pill bg-gold/18 blur-2xl md:block"
                  />
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -start-4 bottom-10 hidden h-28 w-28 rounded-pill bg-gold/14 blur-2xl md:block"
                  />

                  <div className="pointer-events-none absolute -start-4 -top-2 z-[3] hidden w-36 rotate-[-4deg] md:block lg:-start-8 lg:w-44 lg:-top-6">
                    <PhotoFrame
                      ratio="square"
                      variant="soft"
                      rounded="card"
                      label="فضای آکادمی"
                      photoCaption="bottom"
                      className="border-gold/22 shadow-xl shadow-black/45 ring-1 ring-gold/15"
                      showIcon={false}
                      src={sitePhotos.academyAccent}
                      alt="فضای آکادمی"
                    />
                  </div>

                  <div className="relative z-[2] mx-auto w-full max-w-[15.5rem] sm:max-w-[17rem]">
                    <PhotoFrame
                      ratio="story"
                      variant="radial"
                      rounded="card-lg"
                      label="نمای اپ آکادمی"
                      badge="پیش‌نمایش"
                      className="border-gold/25 shadow-black/35 neon-surface-framed ring-1 ring-gold/18"
                      src={sitePhotos.academyStory}
                      alt="پیش‌نمایش اپلیکیشن آکادمی روی موبایل"
                      photoCaption="none"
                      priority
                    />
                  </div>

                  <div className="relative z-[4] mx-auto mt-5 flex justify-center px-4 md:mt-8">
                    <span className="rounded-pill border border-gold/35 bg-charcoal/90 px-3.5 py-1 text-caption leading-none text-gold shadow-md shadow-black/30 backdrop-blur-md">
                      VIP · فقط اعضای آکادمی
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* PILLARS */}
      <section className="border-t border-gold/12 bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">چهار ستون آکادمی</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">یک اکوسیستم؛ نه چند سرویس جدا.</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <FeatureCard
                  icon={p.icon}
                  title={p.title}
                  description={p.body}
                  tone={i === 3 ? "gold" : "emerald"}
                  badge={`۰${i + 1}`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <WhyDifferent />

      {/* APP SHOWCASE */}
      <section className="relative isolate overflow-hidden border-t border-gold/15 bg-ink py-section">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,color-mix(in_oklab,var(--color-gold)_12%,transparent),transparent_58%)]"
        />
        <div className="container-luxe relative">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">تجربه‌ی محصولی</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">نگاهی به اپ خصوصی آکادمی.</h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-5 md:text-base">
              خانه، مسیر و اتاق رشد؛ هر کدام یک ابزار کوتاه برای اجرا.
            </p>
          </Reveal>

          <AcademyAppScreensShowcase
            variant="gold"
            items={appShowcase.map(({ src, title, note, label }) => ({
              src,
              title,
              note,
              label,
              alt: title,
            }))}
          />
        </div>
      </section>

      {/* MEMBER BENEFITS */}
      <section className="border-t border-gold/10 bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">مزایای عضویت</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">فراتر از کلاس؛ یک محیط رشد.</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06}>
                <FeatureCard
                  icon={b.icon}
                  title={b.title}
                  description={b.body}
                  tone={i % 2 === 0 ? "emerald" : "gold"}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* EXCLUSIVITY */}
      <section className="border-t border-gold/12 bg-ink py-section-sm">
        <div className="container-luxe">
          <div
            data-neon-tone="gold"
            className="neon-cta-slab relative overflow-hidden rounded-card border border-gold/30 bg-gradient-to-b from-ink via-charcoal/55 to-ink p-5 sm:p-8 md:p-14"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_15%_10%,color-mix(in_oklab,var(--color-gold)_20%,transparent),transparent_72%)]"
            />
            <div className="relative grid gap-5 md:grid-cols-12 md:items-center md:gap-10 md:gap-y-6">
              <div className="md:col-span-7">
                <IconTile icon={Lock} tone="gold" size="lg" />
                <h2 className="mt-4 text-h3 text-balance text-bone md:mt-7 md:text-h2">آکادمی، برای همه نیست.</h2>
                <p className="mt-3 max-w-2xl text-sm text-bone-dim md:mt-5 md:text-base">
                  ورود دوطرفه است؛ فقط وقتی مسیر و اجرا جدی باشد.
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-bone-dim md:mt-6 md:space-y-3 md:text-base">
                  <li className="flex items-center gap-3">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    کمپین‌نویسی را جلو می‌بری.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    فرم ارزیابی را تکمیل می‌کنی.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    تیم تناسب را بررسی می‌کند.
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                    با تأیید، وارد فضای خصوصی می‌شوی.
                  </li>
                </ul>
              </div>
              <div className="md:col-span-5">
                <div
                  data-neon-tone="gold"
                  className="neon-surface-static rounded-card border border-gold/20 bg-charcoal/55 p-5 ring-1 ring-gold/10 md:p-6"
                >
                  <p className="text-caption uppercase tracking-[0.25em] text-gold">گام‌های ورود</p>
                  <ol className="mt-5 space-y-4">
                    {[
                      ["دوره عمومی", "گذراندن کمپین‌نویسی"],
                      ["درخواست", "تکمیل فرم ارزیابی"],
                      ["گفت‌وگو", "تماس ارزیابی با تیم"],
                      ["ورود", "دسترسی به آکادمی"],
                    ].map(([t, b], i) => (
                      <li key={t} className="flex items-start gap-3">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-bone/15 text-caption text-bone-dim">
                          ۰{i + 1}
                        </span>
                        <div>
                          <p className="text-bone">{t}</p>
                          <p className="text-caption text-mist">{b}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <LinkButton href="/apply" variant="vip" size="md" withArrow className="mt-6 w-full">
                    شروع از ارزیابی
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative isolate overflow-hidden border-t border-gold/15 bg-obsidian py-section">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_55%_at_85%_15%,color-mix(in_oklab,var(--color-gold)_14%,transparent),transparent_65%)]"
        />
        <div className="container-luxe relative">
          <div
            data-neon-tone="gold"
            className="neon-cta-slab relative overflow-hidden rounded-card border border-gold/28 bg-gradient-to-b from-ink via-charcoal/65 to-ink p-5 sm:p-8 md:p-14"
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_65%_at_20%_90%,color-mix(in_oklab,var(--color-gold)_12%,transparent),transparent_70%)]"
            />
            <div className="relative">
              <IconTile icon={Compass} tone="gold" size="lg" />
              <h2 className="mt-6 text-h3 text-balance text-bone md:mt-8 md:text-h2">وقتی آماده‌ای، در باز است.</h2>
              <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-6 md:text-base">
                کمپین‌نویسی، گام آشنایی؛ بعد، ارزیابی برای ورود.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
                <LinkButton href="/course/campaign-writing" variant="sales" size="lg" withArrow>
                  شروع از کمپین‌نویسی
                </LinkButton>
                <Link
                  href="/apply"
                  className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                >
                  من آماده‌ام
                  <ArrowLeft className="rtl-flip h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
