"use client";

import { motion, useReducedMotion } from "framer-motion";
import { GraduationCap, Mic2, Sparkles, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Badge } from "@/components/ui/Badge";
import { sitePhotos } from "@/lib/site-photo-paths";
import { ease, dur } from "@/components/motion/easings";

const LIGHT_PANEL_PAD = "px-4 pt-2 pb-5 sm:p-6 md:p-10 lg:p-12 xl:p-14";

export function HeroCinematic() {
  const reduce = useReducedMotion();
  const bgInitial = reduce ? false : { opacity: 0, scale: 1.04 };
  const bgAnimate = { opacity: 1, scale: 1 };

  const grid = (
    <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:gap-5 md:gap-6 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-10">
      <div className="min-w-0 text-center lg:col-span-7 lg:col-start-1 lg:row-start-1 lg:text-start">
        <Reveal>
          <Badge
            tone="emerald"
            className="hero-panel-badge mx-auto mb-1 w-fit gap-1.5 px-2.5 py-1 text-xs leading-tight sm:mb-1.5 sm:text-caption md:mb-3 md:mx-0 md:gap-2 md:px-3 md:py-1"
          >
            <Sparkles className="h-3 w-3 shrink-0 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" strokeWidth={1.6} aria-hidden />
            مسیر کمپین‌نویسی
          </Badge>
        </Reveal>
        <Reveal delay={0.12}>
          <h1 className="hero-panel-headline mt-1.5 whitespace-pre-line text-balance text-[clamp(1.15rem,5vw,1.75rem)] font-black leading-[1.15] tracking-[-0.02em] text-bone sm:mt-2 sm:text-[clamp(1.2rem,4.8vw,1.85rem)] md:mt-3 md:text-h1 md:leading-[var(--text-h1--line-height)] md:tracking-[var(--text-h1--letter-spacing)]">
            <span className="lg:hidden">{site.hero.headlineMobile}</span>
            <span className="hero-headline-gradient hidden lg:inline lg:text-[clamp(2.15rem,2.6vw+1.1rem,3.5rem)] lg:leading-[1.24]">
              {site.hero.headline}
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.22}>
          <p className="hero-panel-sub mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-bone-dim sm:mt-3 md:mt-4 lg:mx-0 md:text-body">
            {site.hero.sub}
          </p>
        </Reveal>
      </div>

      <div className="min-w-0 lg:col-span-12 lg:col-start-1 lg:row-start-2 lg:self-start">
        <Reveal delay={0.3}>
          <div className="mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-2 sm:gap-2.5 md:mx-0 md:w-full md:justify-start md:gap-4">
            <TrackedLinkButton
              href={site.ctaPrimary.href}
              event="homepage_cta_click"
              eventProps={{ cta: "hero_primary", location: "hero" }}
              variant="primary"
              withArrow
              size="lg"
              className="hero-cta-glow h-auto min-h-0 w-fit shrink-0 px-4 py-2.5 text-sm shadow-lg sm:h-11 sm:min-h-11 sm:px-5 md:h-14 md:min-h-14 md:min-w-52 md:w-auto md:px-8 md:text-base"
            >
              {site.ctaPrimary.label}
            </TrackedLinkButton>
            <TrackedLinkButton
              href={site.ctaSecondary.href}
              event="homepage_cta_click"
              eventProps={{ cta: "hero_saat", location: "hero" }}
              variant="ghost"
              size="lg"
              className="hero-ghost-cta h-auto min-h-0 w-fit shrink-0 px-4 py-2.5 text-sm backdrop-blur-md hover:-translate-y-px sm:h-11 sm:min-h-11 sm:px-5 md:h-14 md:min-h-14 md:min-w-44 md:w-auto md:px-8 md:text-base"
            >
              {site.ctaSecondary.label}
            </TrackedLinkButton>
          </div>
        </Reveal>

        <div className="hero-stats-glass mx-auto mt-4 grid w-fit max-w-full grid-cols-3 gap-1.5 rounded-card-lg px-2.5 py-3 sm:mt-5 sm:w-full sm:max-w-[485px] sm:gap-2 sm:px-4 sm:py-5 md:mt-8 lg:mx-0 lg:w-[485px] lg:px-6">
          <TrustStat divided icon={Users} value="700K+" label="مخاطب" />
          <TrustStat divided icon={GraduationCap} value="50K+" label="دانشجو" />
          <TrustStat icon={Mic2} value="10+" label="سال تجربه" />
        </div>
      </div>
    </div>
  );

  return (
    <section aria-label="معرفی" className="hero-light-section relative isolate pt-6 pb-4 md:pt-8 md:pb-6">
      <div className="container-luxe min-h-0">
        <div className="hero-light-panel relative overflow-hidden rounded-card-lg">
          <motion.div
            className="hero-light-grid-bg pointer-events-none absolute inset-0 z-0"
            initial={bgInitial}
            animate={bgAnimate}
            transition={{ duration: dur.xl, ease: ease.luxe }}
            aria-hidden
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- art-directed hero background */}
            <picture className="hero-light-grid-picture">
              <source media="(max-width: 767px)" srcSet={sitePhotos.heroBackgroundMobile} />
              <img
                src={sitePhotos.heroBackground}
                alt=""
                className="hero-light-grid-img"
                decoding="async"
                fetchPriority="high"
              />
            </picture>
            <div className="hero-light-grid-scrim" aria-hidden />
          </motion.div>
          <div className={cn("hero-light-content relative z-[1]", LIGHT_PANEL_PAD)}>{grid}</div>
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
        "hero-stat-item flex min-w-0 flex-col items-center gap-1 px-1.5 text-center max-md:w-fit max-md:shrink-0 sm:flex-row sm:justify-center sm:gap-3 sm:px-3",
        divided &&
          "max-md:border-e max-md:border-b-0 max-md:last:border-e-0 border-b border-bone/10 last:border-b-0 min-[380px]:border-b-0 min-[380px]:border-e min-[380px]:last:border-e-0",
      )}
    >
      <span className="hero-stat-icon inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill border border-emerald-glow/35 bg-emerald-glow/10 text-emerald-glow shadow-[0_0_22px_-5px_color-mix(in_oklab,var(--color-emerald-glow)_50%,transparent)] sm:h-10 sm:w-10">
        <Icon className="h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" strokeWidth={1.5} aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="hero-stat-value font-display text-lg font-semibold leading-none num-latin min-[380px]:text-xl sm:text-h3">
          {value}
        </p>
        <p className="hero-stat-label mt-1 text-caption leading-snug text-mist">{label}</p>
      </div>
    </div>
  );
}
