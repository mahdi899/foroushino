import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  BookmarkCheck,
  Calendar,
  Home,
  LayoutGrid,
  Lock,
  Mic,
  Sparkles,
  User,
} from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { AcademyAppScreensShowcase } from "@/components/sections/AcademyAppScreensShowcase";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { IconTile } from "@/components/ui/IconTile";
import { pageHeroBackdropPhoto, sitePhotos } from "@/lib/site-photo-paths";

export const metadata: Metadata = buildMetadata({
  title: "اپ خصوصی آکادمی",
  description: "خانه، مسیر، اتاق رشد و هویت تو در یک اپ خصوصی؛ تجربه‌ی محصولی آکادمی.",
  path: "/academy/app",
});

const features = [
  { icon: Home, title: "خانه — صبحِ تو", body: "صدای امروز، گام بعدی، اتاق رشد." },
  { icon: LayoutGrid, title: "مسیر — Path", body: "۱۰ فصل کمپین‌نویسی با تمرین اجرا." },
  { icon: Mic, title: "صدای روزانه — Voice", body: "یادداشت روزانه برای ذهن حرفه‌ای." },
  { icon: User, title: "من — Identity", body: "لِجِر، سند رشد، کارت عضویت." },
  { icon: Bell, title: "اعلان‌های هوشمند", body: "بدون نویز؛ فقط چیزهای مهم رشد." },
  { icon: Calendar, title: "نشست‌ها", body: "کارگاه‌ها و جلسات منتورینگ." },
  { icon: BookmarkCheck, title: "نشانه‌گذاری", body: "ذخیره‌ی نکته‌ها در سند شخصی." },
  { icon: Sparkles, title: "تجربه‌ی لوکس", body: "RTL، موشن ملایم، حس محصول حرفه‌ای." },
];

export default function AcademyAppPage() {
  return (
    <main id="main-content" className="relative min-w-0 max-w-full">
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink">
        <div aria-hidden className="absolute inset-0">
          <Image src={pageHeroBackdropPhoto} alt="" fill priority className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/75 to-ink" />
        </div>
        <div className="container-luxe relative z-[2] py-section-sm md:py-section">
          <div className="grid items-center gap-8 md:grid-cols-12 md:gap-12">
            <div className="md:col-span-7">
              <Reveal>
                <Badge tone="emerald" className="mb-4 md:mb-6">
                  <Lock className="h-3.5 w-3.5" strokeWidth={1.6} aria-hidden />
                  Private App · Tier 2
                </Badge>
              </Reveal>
              <Reveal delay={0.06}>
                <Eyebrow>اپ خصوصی</Eyebrow>
              </Reveal>
              <Reveal delay={0.12}>
                <h1 className="mt-4 max-w-full min-w-0 text-h1 text-balance md:mt-6 md:text-display">
                  تجربه‌ی محصولیِ آکادمی،
                  <br />
                  در جیبِ تو.
                </h1>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-4 max-w-2xl text-base leading-relaxed text-bone-dim md:mt-7 md:text-lg">
                  مسیر، اتاق رشد، صدا و هویت؛ یک تجربه واحد و آرام.
                </p>
              </Reveal>
              <Reveal delay={0.28}>
                <div className="mt-6 flex flex-wrap items-center gap-2.5 md:mt-10 md:gap-4">
                  <LinkButton href="/apply" variant="sales" size="lg" withArrow>
                    درخواست ورود
                  </LinkButton>
                  <LinkButton href="/academy" variant="ghost" size="lg">
                    آشنایی با آکادمی
                  </LinkButton>
                </div>
              </Reveal>
            </div>

            <div className="md:col-span-5">
              <Reveal delay={0.2}>
                <div className="relative mx-auto grid max-w-[19.5rem] grid-cols-2 gap-2.5 min-[400px]:max-w-md min-[400px]:gap-4 md:ms-auto md:me-0">
                  <div className="relative col-span-1 -translate-y-2 min-[400px]:-translate-y-4">
                    <div
                      aria-hidden
                      className="absolute -inset-3 -z-[1] rounded-[34px] bg-emerald-deep/30 blur-2xl min-[400px]:-inset-4"
                    />
                    <div
                      data-neon-tone="emerald"
                      className="neon-surface-static min-w-0 overflow-hidden rounded-[28px] border border-bone/12 bg-ink min-[400px]:rounded-[34px]"
                    >
                      <Image src={sitePhotos.academyAppHome} alt="" width={420} height={860} className="h-auto w-full" />
                    </div>
                  </div>
                  <div className="relative col-span-1 translate-y-2 min-[400px]:translate-y-4">
                    <div
                      aria-hidden
                      className="absolute -inset-3 -z-[1] rounded-[34px] bg-gold/15 blur-2xl min-[400px]:-inset-4"
                    />
                    <div
                      data-neon-tone="gold"
                      className="neon-surface-static min-w-0 overflow-hidden rounded-[28px] border border-bone/12 bg-ink min-[400px]:rounded-[34px]"
                    >
                      <Image src={sitePhotos.academyAppPath} alt="" width={420} height={860} className="h-auto w-full" />
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURE GRID */}
      <section className="py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>قابلیت‌های کلیدی</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance">همه چیز لازم برای مسیر، یک‌جا.</h2>
          </Reveal>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 md:mt-12 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.05}>
                <FeatureCard
                  icon={f.icon}
                  title={f.title}
                  description={f.body}
                  tone={i === 7 ? "gold" : "emerald"}
                />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SCREENSHOT TRIPTYCH */}
      <section className="bg-obsidian py-section-sm">
        <div className="container-luxe">
          <Reveal>
            <Eyebrow>سه نمای اصلی</Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2 className="mt-5 max-w-3xl text-h2 text-balance">سه صفحه، کم حرف و شفاف.</h2>
          </Reveal>

          <AcademyAppScreensShowcase
            variant="emerald"
            items={[
              { src: sitePhotos.academyAppHome, title: "خانه", note: "صبح تو، در یک نگاه." },
              { src: sitePhotos.academyAppPath, title: "مسیر", note: "ده فصل، یک مسیر." },
              { src: sitePhotos.academyAppAtelier, title: "اتاق رشد", note: "تیم رشد همراه تو." },
            ]}
          />
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
              <IconTile icon={Sparkles} tone="gold" size="lg" />
              <h2 className="mt-5 text-h3 text-balance md:mt-8 md:text-h2">
                ورود به اپ، انتخابی است.
              </h2>
              <p className="mt-4 max-w-2xl text-sm text-bone-dim md:mt-6 md:text-base">
                فقط برای اعضا؛ بعد از مسیر و تأیید.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 md:mt-10 md:gap-4">
                <LinkButton href="/apply" variant="sales" size="lg" withArrow>
                  درخواست ورود
                </LinkButton>
                <Link
                  href="/course/campaign-writing"
                  className="inline-flex items-center gap-2 text-gold transition-colors hover:text-gold-soft"
                >
                  ابتدا از دوره شروع کن
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
