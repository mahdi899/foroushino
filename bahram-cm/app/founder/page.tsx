import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  Compass,
  GraduationCap,
  HandHeart,
  Lightbulb,
  Mic2,
  Quote,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconLabel } from "@/components/ui/IconLabel";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { pageHeroBackdropPhoto, sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "بهرام رستمی · معمار مسیر رشد حرفه‌ای",
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

export default function FounderPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0">
          <Image src={pageHeroBackdropPhoto} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/78 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] py-section-sm md:py-section">
          <div className="grid min-w-0 items-center gap-6 max-md:gap-8 md:grid-cols-12 md:gap-12">
            <div className="max-md:order-2 md:col-span-7">
              <Reveal>
                <Badge tone="emerald" className="mb-4 md:mb-6">
                  <Mic2 className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  Founder · معلم · سازنده
                </Badge>
              </Reveal>
              <Reveal delay={0.06}>
                <Eyebrow>درباره‌ی بهرام</Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-6 md:text-display">
                  بهرام رستمی — معمارِ
                  <br />
                  مسیرِ رشدِ حرفه‌ای.
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim md:mt-7 md:text-lg">
                  بیش از ده سال آموزش و اجرا؛ تمرکز روی نسخه‌ی حرفه‌ای‌تر تو.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-6 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-4">
                  <LinkButton href="/course/campaign-writing" variant="sales" size="lg" withArrow>
                    شروع مسیر با کمپین‌نویسی
                  </LinkButton>
                  <LinkButton href="/saat" variant="ghost" size="lg">
                    آشنایی با سات
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.36}>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 border-t border-bone/8 pt-4 md:mt-12 md:gap-x-7 md:gap-y-3 md:pt-6">
                  <IconLabel icon={Users} tone="bone">۷۰۰٬۰۰۰+ مخاطب</IconLabel>
                  <IconLabel icon={GraduationCap} tone="emerald">۵۰٬۰۰۰+ دانشجو</IconLabel>
                  <IconLabel icon={Sparkles} tone="gold">۱۰+ سال تجربه</IconLabel>
                </div>
              </Reveal>
            </div>

            <div className="max-md:order-1 md:col-span-5">
              <Reveal delay={0.2}>
                <div className="relative mx-auto max-w-md max-md:max-w-[15rem] md:ms-auto md:me-0 md:max-w-md">
                  <div
                    aria-hidden
                    className="absolute -inset-5 -z-[1] rounded-card bg-emerald-deep/35 blur-2xl"
                  />
                  <PhotoFrame
                    ratio="portrait"
                    variant="radial"
                    rounded="card-lg"
                    badge="پرتره‌ی رسمی"
                    label="بهرام رستمی"
                    className="border-bone/12 shadow-none neon-surface-framed"
                    src={sitePhotos.portraitFounder}
                    alt="بهرام رستمی"
                  />
                </div>
              </Reveal>
            </div>
          </div>
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
              <div className="mt-5 space-y-3 text-sm leading-relaxed text-bone-dim md:mt-7 md:space-y-4 md:text-base">
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
                <Image
                  src="/media/signature.svg"
                  alt="امضای بهرام"
                  width={200}
                  height={70}
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

      {/* CTA */}
      <section className="py-section">
        <div className="container-luxe">
          <div className="neon-cta-slab relative overflow-hidden rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/40 via-charcoal/70 to-ink p-5 sm:p-8 md:p-14">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]"
            />
            <div className="relative">
              <IconTile icon={Compass} tone="gold" size="lg" />
              <h2 className="mt-5 max-w-full text-h3 text-balance md:mt-8 md:text-h2 lg:text-display">
                اگر این نگاه با تو هم‌خوان است،
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-6 md:text-base">
                از کمپین‌نویسی شروع کن؛ مسیر بعدی خودش مشخص می‌شود.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
                <LinkButton href="/course/campaign-writing" variant="sales" size="lg" withArrow>
                  شروع مسیر
                </LinkButton>
                <Link
                  href="/insights"
                  className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                >
                  رفتن به بلاگ
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
