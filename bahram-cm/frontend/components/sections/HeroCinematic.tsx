"use client";

import { motion } from "framer-motion";
import { GraduationCap, Mic2, Sparkles, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Badge } from "@/components/ui/Badge";
import { SiteImage } from "@/components/ui/SiteImage";
import { sitePhotos } from "@/lib/site-photo-paths";
import { ease, dur } from "@/components/motion/easings";
import "@/styles/hero-cinematic.css";

const LIGHT_PANEL_PAD = "px-4 pt-2 pb-5 sm:px-6 sm:py-6 md:px-10 md:py-8 lg:px-12 lg:py-12 xl:px-14";

export function HeroCinematic() {
  const bgInitial = false;
  const bgAnimate = { scale: 1 };

  const grid = (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-10">
      <div className="hero-copy lg:col-span-7 lg:col-start-1 lg:row-start-1">
        <Badge
          tone="emerald"
          className="hero-panel-badge mx-auto mb-1 w-fit gap-1.5 px-2.5 py-1 text-xs leading-tight sm:mb-1.5 sm:text-caption lg:mx-0 lg:mb-3 lg:gap-2 lg:px-3 lg:py-1"
        >
          <Sparkles className="h-3 w-3 shrink-0 sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5" strokeWidth={1.6} aria-hidden />
          مسیر کمپین‌نویسی
        </Badge>
        <h1 className="hero-panel-headline mt-1.5 whitespace-pre-line font-black tracking-[-0.02em] text-bone sm:mt-2 lg:mt-3">
          <span
            className="hero-headline-mobile lg:hidden"
            style={{ fontSize: "var(--hero-headline-size, clamp(1.4rem, 6vw, 2rem))" }}
          >
            {site.hero.headlineMobile}
          </span>
          <span className="hero-headline-desktop hero-headline-gradient hidden lg:inline lg:text-[clamp(2.15rem,2.6vw+1.1rem,3.5rem)] lg:leading-[1.24]">
            {site.hero.headline}
          </span>
        </h1>
        <p className="hero-panel-sub mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-bone-dim sm:mt-3 sm:text-base lg:mx-0 lg:mt-4 lg:text-body">
          {site.hero.sub}
        </p>
      </div>

      <div className="min-w-0 lg:col-span-12 lg:col-start-1 lg:row-start-2 lg:self-start">
        <div className="hero-actions mx-auto w-fit max-w-full sm:gap-2.5 lg:mx-0 lg:w-full lg:gap-4">
          <TrackedLinkButton
            href={site.ctaPrimary.href}
            event="homepage_cta_click"
            eventProps={{ cta: "hero_primary", location: "hero" }}
            variant="primary"
            withArrow
            size="lg"
            className="hero-cta-glow h-auto min-h-0 w-fit shrink-0 px-4 py-2.5 text-sm shadow-lg sm:h-11 sm:min-h-11 sm:px-5 lg:h-14 lg:min-h-14 lg:min-w-52 lg:w-auto lg:px-8 lg:text-base"
          >
            {site.ctaPrimary.label}
          </TrackedLinkButton>
          <TrackedLinkButton
            href={site.ctaSecondary.href}
            event="homepage_cta_click"
            eventProps={{ cta: "hero_saat", location: "hero" }}
            variant="ghost"
            size="lg"
            className="hero-ghost-cta h-auto min-h-0 w-fit shrink-0 px-4 py-2.5 text-sm backdrop-blur-md hover:-translate-y-px sm:h-11 sm:min-h-11 sm:px-5 lg:h-14 lg:min-h-14 lg:min-w-44 lg:w-auto lg:px-8 lg:text-base"
          >
            {site.ctaSecondary.label}
          </TrackedLinkButton>
        </div>

        <div className="hero-stats-glass mx-auto mt-4 grid grid-cols-3 gap-1.5 rounded-card-lg px-2.5 py-3 sm:mt-5 sm:gap-2 sm:px-4 sm:py-5 lg:mt-8 lg:px-6">
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
          <div className={cn("hero-light-content", LIGHT_PANEL_PAD)}>{grid}</div>

          <div className="hero-light-media hero-light-media--mobile lg:hidden" aria-hidden>
            <motion.div
              className="hero-light-media-motion"
              initial={bgInitial}
              animate={bgAnimate}
              transition={{ duration: dur.xl, ease: ease.luxe }}
            >
              <SiteImage
                src={sitePhotos.heroBackgroundMobile}
                alt=""
                width={859}
                height={1024}
                priority
                sizes="100vw"
                wrapperClassName="hero-light-grid-picture"
                className="hero-light-grid-img hero-light-grid-img--mobile"
              />
            </motion.div>
            <div className="hero-light-grid-scrim" />
          </div>

          <div className="hero-light-media hero-light-media--desktop hidden lg:block" aria-hidden>
            <motion.div
              className="hero-light-media-motion"
              initial={bgInitial}
              animate={bgAnimate}
              transition={{ duration: dur.xl, ease: ease.luxe }}
            >
              <SiteImage
                src={sitePhotos.heroBackground}
                alt=""
                width={1920}
                height={1080}
                priority
                sizes="(min-width: 1024px) 55vw, 0"
                wrapperClassName="hero-light-grid-picture"
                className="hero-light-grid-img hero-light-grid-img--desktop"
              />
            </motion.div>
            <div className="hero-light-grid-scrim" />
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
        "hero-stat-item flex min-w-0 flex-col items-center gap-1 px-1.5 text-center max-sm:w-fit max-sm:shrink-0 sm:flex-row sm:justify-center sm:gap-3 sm:px-3",
        divided &&
          "max-sm:border-e max-sm:border-b-0 max-sm:last:border-e-0 border-b border-bone/10 last:border-b-0 min-[380px]:border-b-0 min-[380px]:border-e min-[380px]:last:border-e-0",
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
