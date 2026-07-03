import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  Compass,
  Layers,
  Phone,
  Smartphone,
  Target,
  TrendingUp,
  Users,
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
import { site } from "@/content/site";
import { sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "سات · سیستم فروش تلفنی",
  description:
    "مینی‌اپ فروش تلفنی برای مدیریت تماس، لید، پیگیری، فیدبک و فروش — سات | هر تماس، یه فروش.",
  path: "/saat",
});

const valueCards = [
  {
    icon: Smartphone,
    title: "مینی‌اپ فروش",
    body: "همه‌چیز در یک محیط متمرکز؛ از شروع روز تا ثبت نتیجه تماس‌ها.",
  },
  {
    icon: Users,
    title: "مدیریت لیدها",
    body: "شماره‌ها، وضعیت‌ها و سرنخ‌ها منظم‌اند؛ هر لید یک مسیر مشخص دارد.",
  },
  {
    icon: ClipboardList,
    title: "پیگیری و فیدبک",
    body: "بعد از هر تماس، نتیجه ثبت می‌شود و مسیر بعدی معلوم است.",
  },
  {
    icon: TrendingUp,
    title: "فروش و کمیسیون",
    body: "فروش فقط حرف نیست؛ نتیجه ثبت می‌شود، عملکرد دیده می‌شود و سهم فروشنده مشخص می‌ماند.",
  },
];

const showcaseItems = [
  {
    src: sitePhotos.academyAppHome,
    title: "داشبورد",
    note: "نمای کلی تماس‌ها، وضعیت عملکرد و تصویر روشن از روز فروش.",
    label: "داشبورد",
  },
  {
    src: sitePhotos.academyAppPath,
    title: "لیدها و پیگیری",
    note: "هر سرنخ، وضعیت مشخص، یادداشت مشخص و قدم بعدی مشخص دارد.",
    label: "لیدها",
  },
  {
    src: sitePhotos.academyAppAtelier,
    title: "فروش و نتیجه",
    note: "ثبت نتیجه نهایی، سنجش عملکرد و حرکت به سمت فروش واقعی.",
    label: "فروش",
  },
];

const layers = [
  {
    icon: Phone,
    title: "لید و تماس",
    body: "ورود سرنخ‌ها، مشاهده اطلاعات، تماس‌گیری سریع و شروع مسیر فروش.",
  },
  {
    icon: Target,
    title: "پیگیری و تحلیل",
    body: "ثبت فیدبک، دسته‌بندی وضعیت‌ها، یادآوری پیگیری و شفاف شدن قدم بعدی.",
  },
  {
    icon: BarChart3,
    title: "فروش و کمیسیون",
    body: "وقتی تماس به نتیجه می‌رسد، فروش ثبت می‌شود، عملکرد دیده می‌شود و خروجی واقعی تیم مشخص می‌ماند.",
  },
];

const exclusivityBullets = [
  "اگر می‌خواهی تماس‌هایت مسیر و نتیجه داشته باشند، سات برای توست.",
  "اگر دنبال نظم، پیگیری و خروجی واقعی هستی، سات برای توست.",
  "اگر می‌خواهی فروش را فقط حس نکنی و واقعاً اندازه بگیری، سات برای توست.",
  "اگر قرار است بخشی از یک تیم فروش جدی باشی، سات برای تو معنا پیدا می‌کند.",
];

export default function SaatPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* سکشن ۱ — Hero */}
      <section
        aria-labelledby="saat-hero-heading"
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
                  {site.saat.eyebrow}
                </Badge>
              </Reveal>
              <Reveal delay={0.06}>
                <Eyebrow className="rounded-pill border border-gold/35 bg-gold/[0.08] px-4 py-2 shadow-sm shadow-black/20 backdrop-blur-sm">
                  مینی‌اپ اختصاصی فروش
                </Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h1
                  id="saat-hero-heading"
                  className="mt-4 max-w-full min-w-0 bg-gradient-to-l from-bone via-gold-soft to-bone bg-clip-text text-h1 text-balance text-transparent md:mt-6 md:text-display"
                >
                  سات برای کسانی‌ست که فروش را جدی می‌گیرند.
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim md:mt-7 md:text-lg">
                  سات فقط یک ابزار نیست؛ یک جریان کاری کامل برای تماس، پیگیری، ثبت فیدبک، سنجش
                  عملکرد و تبدیل لید به فروش است. اگر قرار است فروش تلفنی به‌صورت جدی،
                  ساختاریافته و روزانه پیش برود، سات همان جایی‌ست که این مسیر داخلش اتفاق
                  می‌افتد.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-6 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-4">
                  <LinkButton href="/saat#showcase" variant="vip" size="lg" withArrow>
                    دیدن سات
                  </LinkButton>
                  <LinkButton
                    href="/apply"
                    variant="ghost"
                    size="lg"
                    className="border-gold/22 hover:border-gold/40 hover:bg-gold/[0.06]"
                  >
                    درخواست دسترسی
                  </LinkButton>
                </div>
              </Reveal>
              <Reveal delay={0.36}>
                <div className="mt-6 flex flex-wrap gap-x-4 gap-y-2.5 border-t border-gold/15 pt-4 md:mt-12 md:gap-x-7 md:gap-y-3 md:pt-6">
                  <IconLabel icon={Phone} tone="gold">
                    تماس هدفمند
                  </IconLabel>
                  <IconLabel icon={ClipboardList} tone="gold">
                    پیگیری دقیق
                  </IconLabel>
                  <IconLabel icon={TrendingUp} tone="gold">
                    فروش قابل‌سنجش
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
                      label="فضای تیم فروش"
                      photoCaption="bottom"
                      className="border-gold/22 shadow-xl shadow-black/45 ring-1 ring-gold/15"
                      showIcon={false}
                      src={sitePhotos.academyAccent}
                      alt="فضای تیم فروش"
                    />
                  </div>

                  <div className="relative z-[2] mx-auto w-full max-w-[15.5rem] sm:max-w-[17rem]">
                    <PhotoFrame
                      ratio="story"
                      variant="radial"
                      rounded="card-lg"
                      label="پیش‌نمایش اپ"
                      badge="پیش‌نمایش اپ"
                      className="border-gold/25 shadow-black/35 neon-surface-framed ring-1 ring-gold/18"
                      src={sitePhotos.academyStory}
                      alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                      photoCaption="none"
                      priority
                    />
                  </div>

                  <div className="relative z-[4] mx-auto mt-5 flex justify-center px-4 md:mt-8">
                    <span className="rounded-pill border border-gold/35 bg-charcoal/90 px-3.5 py-1 text-caption leading-none text-gold shadow-md shadow-black/30 backdrop-blur-md">
                      {site.tagline}
                    </span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* سکشن ۲ — معرفی ارزش اصلی */}
      <section className="border-t border-gold/12 bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
              ارزش اصلی
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">
              یک سیستم، نه چند ابزار پراکنده.
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:text-base">
              سات بخش‌های مختلف فروش تلفنی را در یک مسیر واحد جمع می‌کند؛ جایی برای تماس، لید،
              پیگیری، ثبت نتیجه و دیدن عملکرد — بدون پراکندگی و بدون حدس‌زدن.
            </p>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {valueCards.map((p, i) => (
              <Reveal key={p.title} delay={i * 0.06}>
                <FeatureCard
                  icon={p.icon}
                  title={p.title}
                  description={p.body}
                  tone={i === 0 ? "gold" : "emerald"}
                  badge={`۰${i + 1}`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* سکشن ۳ — مقایسه */}
      <WhyDifferent />

      {/* سکشن ۴ — گالری */}
      <section
        id="showcase"
        className="relative isolate overflow-hidden border-t border-gold/15 bg-ink py-section scroll-mt-20"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_50%_at_50%_0%,color-mix(in_oklab,var(--color-gold)_12%,transparent),transparent_58%)]"
        />
        <div className="container-luxe relative">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
              از نزدیک
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">نگاهی به سات از نزدیک</h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-5 md:text-base">
              چند نمای ساده از محیطی که فروش را روزانه، روشن و قابل‌مدیریت می‌کند.
            </p>
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

      {/* سکشن ۵ — سه لایه اصلی */}
      <section className="border-t border-gold/10 bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
              سه لایه اصلی سات
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance text-bone">
              سات بر سه بخش اصلی بنا شده است.
            </h2>
          </Reveal>
          <div className="mt-8 grid gap-3 sm:gap-5 md:mt-12 md:grid-cols-3">
            {layers.map((layer, i) => (
              <Reveal key={layer.title} delay={i * 0.06}>
                <FeatureCard
                  icon={layer.icon}
                  title={layer.title}
                  description={layer.body}
                  tone={i === 1 ? "gold" : "emerald"}
                  badge={`۰${i + 1}`}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* سکشن ۶ — برای همه نیست */}
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
                <IconTile icon={Layers} tone="gold" size="lg" />
                <p className="mt-4 text-caption uppercase tracking-[0.25em] text-gold md:mt-6">
                  انتخابی و جدی
                </p>
                <h2 className="mt-3 text-h3 text-balance text-bone md:mt-4 md:text-h2">
                  سات برای همه نیست.
                </h2>
                <p className="mt-3 max-w-2xl text-sm text-bone-dim md:mt-5 md:text-base">
                  سات برای کسی‌ست که می‌خواهد واقعاً وارد میدان فروش شود؛ نه برای تماشا، نه
                  برای هیجان مقطعی، نه برای حرکت بی‌نظم.
                </p>
                <ul className="mt-4 space-y-2.5 text-sm text-bone-dim md:mt-6 md:space-y-3 md:text-base">
                  {exclusivityBullets.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="md:col-span-5">
                <div
                  data-neon-tone="gold"
                  className="neon-surface-static rounded-card border border-gold/20 bg-charcoal/55 p-5 ring-1 ring-gold/10 md:p-6"
                >
                  <p className="text-bone">می‌خواهی سات را ببینی؟</p>
                  <p className="mt-2 text-sm text-bone-dim">
                    برای آشنایی بیشتر با سیستم یا بررسی دسترسی، از اینجا وارد شو.
                  </p>
                  <LinkButton href="/apply" variant="vip" size="md" withArrow className="mt-6 w-full">
                    درخواست دسترسی به سات
                  </LinkButton>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* سکشن ۷ — CTA پایانی */}
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
              <h2 className="mt-6 text-h3 text-balance text-bone md:mt-8 md:text-h2">
                وقتی آماده‌ای، فروش از اینجا جدی‌تر می‌شود.
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-6 md:text-base">
                سات برای این ساخته شده که تماس، پیگیری و فروش را از حالت پراکنده خارج کند و به
                یک مسیر واقعی تبدیل کند. اگر می‌خواهی سیستم را از نزدیک ببینی، از همین‌جا
                شروع کن.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
                <LinkButton href="/apply" variant="sales" size="lg" withArrow>
                  درخواست دسترسی به سات
                </LinkButton>
                <Link
                  href="/saat#showcase"
                  className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                >
                  دیدن دموی سات
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
