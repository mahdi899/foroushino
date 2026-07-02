"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { GraduationCap, Mic2, Sparkles, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";
import { CursorGlow } from "@/components/motion/CursorGlow";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Badge } from "@/components/ui/Badge";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export function HeroCinematic() {
  const ref = useRef<HTMLDivElement>(null);
  const dataTheme = useDataTheme();
  const ambientSrc =
    dataTheme === "light"
      ? "/media/hero-ambient-light.svg"
      : "/media/hero-ambient.svg";
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const yPortrait = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -80]);
  const ySecondary = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -40]);
  const yHeadline = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : 60]);

  return (
    <section
      ref={ref}
      aria-label="معرفی"
      className="relative isolate overflow-hidden bg-ink"
    >
      {/* Ambient layer */}
      <div aria-hidden className="absolute inset-0">
        <Image
          key={ambientSrc}
          src={ambientSrc}
          alt=""
          fill
          priority
          className={cn(
            "object-cover",
            dataTheme === "light" ? "opacity-100" : "opacity-[0.92]",
          )}
        />
      </div>
      <CursorGlow
        color={
          dataTheme === "light"
            ? "rgba(20, 167, 132, 0.09)"
            : "rgba(47, 176, 127, 0.18)"
        }
      />

      {/* Animated gradient sheen */}
      <motion.div
        aria-hidden
        className="absolute inset-0 z-[1]"
        animate={
          reduce
            ? undefined
            : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
        }
        transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
        style={{
          backgroundImage: "var(--hero-sheen-gradient)",
          backgroundSize: "200% 200%",
        }}
      />

      {/* Hero vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: "var(--hero-vignette)" }}
      />

      <div className="container-luxe relative z-[3] min-h-[100svh] pt-4 pb-14 md:pt-10 md:pb-28 lg:pt-14 lg:pb-36">
        <div className="grid min-w-0 grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center lg:gap-16">
          {/* معرفی: موبایل اول، دسکتاپ ستون چپ ردیف اول */}
          <motion.div
            className="min-w-0 text-center lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:text-start"
            style={{ y: yHeadline }}
          >
            <Reveal>
              <Badge
                tone="emerald"
                className="mb-1.5 gap-1.5 px-2.5 py-0.5 text-[0.65rem] leading-tight md:mb-7 md:gap-2 md:px-3 md:py-1 md:text-caption"
              >
                <Sparkles className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" strokeWidth={1.6} aria-hidden />
                مسیر کمپین‌نویسی
              </Badge>
            </Reveal>
            <Reveal delay={0.12}>
              <h1 className="mt-2 max-lg:max-w-none whitespace-pre-line text-balance text-[clamp(1.35rem,4vw+0.55rem,2rem)] font-bold tracking-[-0.02em] text-bone max-lg:!leading-none md:mt-6 md:text-h1 md:tracking-[var(--text-h1--letter-spacing)] md:font-bold">
                <span className="lg:hidden">{site.hero.headlineMobile}</span>
                <span className="hidden lg:inline">{site.hero.headline}</span>
              </h1>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="hidden max-w-2xl text-base leading-relaxed text-bone-dim md:mt-10 md:block md:text-lg">
                {site.hero.sub}
              </p>
            </Reveal>
          </motion.div>

          {/* پرتره: موبایل بعد از تیتر، دسکتاپ ستون راست تمام قد */}
          <div className="min-w-0 w-full lg:col-span-5 lg:col-start-8 lg:row-span-3 lg:row-start-1 lg:self-center">
            <Reveal delay={0.18}>
              <div className="relative mx-auto w-full max-w-[min(100%,17.5rem)] sm:max-w-md lg:max-w-none">
                {/* Main portrait */}
                <motion.div
                  style={{ y: yPortrait }}
                  className="relative z-[2]"
                >
                  <PhotoFrame
                    ratio="portrait"
                    variant="radial"
                    rounded="card-lg"
                    badge="پرتره‌ی رسمی"
                    label="بهرام رستمی"
                    src={sitePhotos.portraitFounder}
                    alt="بهرام رستمی"
                    priority
                  />
                </motion.div>

                {/* Secondary square — top-left */}
                <motion.div
                  style={{ y: ySecondary }}
                  className="absolute -start-6 -top-8 z-[3] hidden w-44 rotate-[-4deg] md:block lg:-start-10 lg:w-48"
                >
                  <PhotoFrame
                    ratio="square"
                    variant="grid"
                    rounded="card"
                    label="لحظه‌ی استودیو"
                    showIcon={false}
                    src={sitePhotos.squareStudio}
                    alt="لحظه‌ی استودیو"
                  />
                </motion.div>

                {/* Tertiary landscape — bottom-right */}
                <motion.div
                  style={{ y: ySecondary }}
                  className="absolute -end-6 -bottom-10 z-[3] hidden w-56 rotate-[3deg] md:block lg:-end-12 lg:w-64"
                >
                  <PhotoFrame
                    ratio="landscape"
                    variant="soft"
                    rounded="card"
                    label="نشست خصوصی"
                    showIcon={false}
                    src={sitePhotos.landscapeSession}
                    alt="نشست خصوصی"
                  />
                </motion.div>

                {/* Floating accent */}
                <motion.div
                  aria-hidden
                  className="absolute -end-4 top-12 hidden h-24 w-24 rounded-pill bg-emerald-glow/15 blur-2xl md:block float-slow"
                />
                <motion.div
                  aria-hidden
                  className="absolute -start-6 bottom-20 hidden h-28 w-28 rounded-pill bg-gold/15 blur-2xl md:block float-slow"
                  style={{ animationDelay: "1.6s" }}
                />
              </div>
            </Reveal>
          </div>

          {/* CTAs و آمار اعتماد: موبایل بعد از تصویر، دسکتاپ ادامه‌ی ستون چپ */}
          <div className="min-w-0 lg:col-span-7 lg:col-start-1 lg:row-start-2 lg:self-start">
            <Reveal delay={0.3}>
              <div className="flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                <TrackedLinkButton
                  href={site.ctaPrimary.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "hero_primary", location: "hero" }}
                  withArrow
                  size="lg"
                  className="h-12 min-h-12 w-full min-w-0 text-[0.95rem] sm:h-14 sm:min-h-14 sm:w-auto sm:min-w-48 sm:text-base"
                >
                  {site.ctaPrimary.label}
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/academy"
                  event="homepage_cta_click"
                  eventProps={{ cta: "hero_academy", location: "hero" }}
                  variant="ghost"
                  size="lg"
                  className="h-12 min-h-12 w-full min-w-0 text-[0.95rem] sm:h-14 sm:min-h-14 sm:w-auto sm:text-base"
                >
                  دیدنِ آکادمی
                </TrackedLinkButton>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="mt-6 mx-auto grid max-w-2xl grid-cols-3 gap-1.5 border-t border-bone/8 pt-4 justify-items-center sm:gap-4 sm:pt-5 md:mt-16 md:pt-7">
                <TrustStat icon={Users} value="۷۰۰K+" label="مخاطب" />
                <TrustStat icon={GraduationCap} value="۵۰K+" label="دانشجو" />
                <TrustStat icon={Mic2} value="۱۰+" label="سال تجربه" />
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: string;
  label: string;
}) {
  return (
    <div className="flex min-w-0 w-full flex-col items-center gap-1.5 text-center sm:flex-row sm:justify-center sm:gap-3">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-bone/12 bg-charcoal/55 text-emerald-glow sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="font-display text-lg leading-none text-bone num-latin sm:text-h3">{value}</p>
        <p className="mt-0.5 text-[0.65rem] leading-snug text-mist sm:mt-1 sm:text-caption">{label}</p>
      </div>
    </div>
  );
}
