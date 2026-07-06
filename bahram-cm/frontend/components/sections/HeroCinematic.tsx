"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap, Mic2, Sparkles, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Badge } from "@/components/ui/Badge";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export function HeroCinematic() {
  const reduce = useReducedMotion();
  const hoverEase = [0.22, 1, 0.36, 1] as const;
  const portraitHover = reduce ? undefined : { scale: 1.025, y: -10, transition: { duration: 0.45, ease: hoverEase } };
  const miniHoverTop = reduce ? undefined : { scale: 1.07, rotate: 1, y: -12, transition: { duration: 0.45, ease: hoverEase } };
  const miniHoverBottom = reduce ? undefined : { scale: 1.07, rotate: -1, y: -12, transition: { duration: 0.45, ease: hoverEase } };

  return (
    <section
      aria-label="معرفی"
      className="relative isolate overflow-hidden"
    >
      <div className="container-luxe relative min-h-0 pt-8 pb-10 md:pt-14 md:pb-14 lg:pt-20 lg:pb-16">
        <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-10">
          <div className="min-w-0 text-center lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:text-start">
            <Reveal>
              <Badge
                tone="emerald"
                className="mb-1.5 gap-1.5 px-2.5 py-0.5 text-caption leading-tight md:mb-3 md:gap-2 md:px-3 md:py-1"
              >
                <Sparkles className="h-3 w-3 shrink-0 md:h-3.5 md:w-3.5" strokeWidth={1.6} aria-hidden />
                مسیر کمپین‌نویسی
              </Badge>
            </Reveal>
            <Reveal delay={0.12}>
              <h1 className="mt-2 max-lg:max-w-none whitespace-pre-line text-balance text-[clamp(1.35rem,4vw+0.55rem,2rem)] !font-black tracking-[-0.02em] text-bone max-lg:!leading-none md:mt-3 md:text-h1 md:tracking-[var(--text-h1--letter-spacing)]">
                <span className="lg:hidden">{site.hero.headlineMobile}</span>
                <span className="hero-headline-gradient hidden lg:inline lg:text-[clamp(2.15rem,2.6vw+1.1rem,3.5rem)] lg:leading-[1.24]">
                  {site.hero.headline}
                </span>
              </h1>
            </Reveal>
            <Reveal delay={0.22}>
              <p className="hidden max-w-2xl text-body text-bone-dim md:mt-4 md:block">
                {site.hero.sub}
              </p>
            </Reveal>
          </div>

          <div className="min-w-0 w-full lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:self-start">
            <Reveal delay={0.18}>
              <div className="relative mx-auto w-full max-w-[min(100%,22rem)] md:max-w-none">
                <div
                  dir="ltr"
                  className="flex items-center justify-center gap-2.5 sm:gap-3 md:gap-4 lg:gap-5"
                >
                  <motion.div
                    whileHover={portraitHover}
                    className="relative z-[2] min-w-0 w-full max-w-[min(100%,17rem)] sm:max-w-[15rem] md:max-w-[17rem] lg:max-w-[19rem]"
                  >
                    <PhotoFrame
                      ratio="portrait"
                      variant="radial"
                      rounded="card-lg"
                      badge="پرتره‌ی رسمی"
                      label="بهرام رستمی"
                      labelClassName="hero-founder-label inline-flex w-fit rounded-pill border border-bone/12 bg-ink/78 px-3 py-1.5 normal-case text-sm font-medium tracking-normal text-bone-dim shadow-[0_10px_28px_-14px_rgba(0,0,0,0.75)] backdrop-blur-md drop-shadow-none"
                      src={sitePhotos.portraitFounder}
                      alt="بهرام رستمی"
                      priority
                      interactive
                      neonTone="gold"
                      className="aspect-[3/4]"
                    />
                  </motion.div>

                  <div className="hidden shrink-0 flex-col gap-2.5 md:flex lg:gap-3">
                    <motion.div
                      whileHover={miniHoverTop}
                      className="w-[9rem] rotate-[-3deg] lg:w-[11rem]"
                    >
                      <PhotoFrame
                        ratio="square"
                        variant="grid"
                        rounded="card"
                        photoCaption="none"
                        showIcon={false}
                        interactive
                        neonTone="gold"
                        src={sitePhotos.squareStudio}
                        alt="لحظه‌ی استودیو"
                      />
                    </motion.div>
                    <motion.div
                      whileHover={miniHoverBottom}
                      className="w-[9rem] rotate-[2deg] lg:w-[11rem]"
                    >
                      <PhotoFrame
                        ratio="landscape"
                        variant="soft"
                        rounded="card"
                        photoCaption="none"
                        showIcon={false}
                        interactive
                        neonTone="gold"
                        src={sitePhotos.landscapeSession}
                        alt="نشست خصوصی"
                      />
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -end-2 top-8 hidden h-20 w-20 rounded-pill bg-emerald-glow/15 blur-2xl md:block float-slow"
                />
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -start-2 bottom-8 hidden h-24 w-24 rounded-pill bg-gold/15 blur-2xl md:block float-slow"
                  style={{ animationDelay: "1.6s" }}
                />
              </div>
            </Reveal>

          </div>

          <div className="min-w-0 lg:col-span-7 lg:col-start-1 lg:row-start-2 lg:self-start lg:-mt-1">
            <Reveal delay={0.3}>
              <div className="flex w-full max-w-md flex-col gap-3 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-4">
                <TrackedLinkButton
                  href={site.ctaPrimary.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "hero_primary", location: "hero" }}
                  variant="primary"
                  withArrow
                  size="lg"
                  className="hero-cta-glow h-12 min-h-12 w-full min-w-0 px-8 text-sm shadow-lg sm:h-14 sm:min-h-14 sm:w-auto sm:min-w-52 sm:text-base"
                >
                  {site.ctaPrimary.label}
                </TrackedLinkButton>
                <TrackedLinkButton
                  href={site.ctaSecondary.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "hero_saat", location: "hero" }}
                  variant="ghost"
                  size="lg"
                  className="hero-ghost-cta h-12 min-h-12 w-full min-w-0 px-8 text-sm backdrop-blur-md hover:-translate-y-px sm:h-14 sm:min-h-14 sm:w-auto sm:min-w-44 sm:text-base"
                >
                  {site.ctaSecondary.label}
                </TrackedLinkButton>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="hero-stats-glass mt-5 mx-auto grid max-w-2xl grid-cols-3 gap-1 rounded-card-lg px-2 py-4 justify-items-stretch sm:mt-6 sm:gap-2 sm:px-4 sm:py-5 md:mt-8 lg:px-6">
                <TrustStat divided icon={Users} value="700K+" label="مخاطب" />
                <TrustStat divided icon={GraduationCap} value="50K+" label="دانشجو" />
                <TrustStat icon={Mic2} value="10+" label="سال تجربه" />
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
  divided,
}: {
  icon: typeof Users;
  value: string;
  label: string;
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 w-full flex-col items-center gap-1.5 px-2 text-center sm:flex-row sm:justify-center sm:gap-3 sm:px-3",
        divided && "border-e border-bone/10 last:border-e-0",
      )}
    >
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-emerald-glow/35 bg-emerald-glow/10 text-emerald-glow shadow-[0_0_22px_-5px_color-mix(in_oklab,var(--color-emerald-glow)_50%,transparent)] sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="hero-stat-value font-display text-xl font-semibold leading-none num-latin sm:text-h3">
          {value}
        </p>
        <p className="mt-1 text-caption leading-snug text-mist">{label}</p>
      </div>
    </div>
  );
}
