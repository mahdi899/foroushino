import { GraduationCap, Mic2, Sparkles, Users } from "lucide-react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { NeonBorder } from "@/components/ui/NeonBorder";
import { Badge } from "@/components/ui/Badge";

const LIGHT_PANEL_PAD = "px-4 pt-1 pb-4 sm:px-6 sm:py-6 md:px-10 md:py-8 lg:px-12 lg:py-12 xl:px-14";

/** Hero copy, CTAs, and stats — static markup for instant mobile paint (no motion gate). */
export function HeroCinematicClient() {
  return (
    <div className={cn("hero-light-content", LIGHT_PANEL_PAD)}>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-5 lg:grid-cols-12 lg:items-start lg:gap-x-8 lg:gap-y-10">
        <div className="hero-copy lg:col-span-7 lg:col-start-1 lg:row-start-1">
          <div>
            <Badge
              tone="gold"
              className="hero-panel-badge mx-auto mb-1 w-fit gap-1.5 px-2.5 py-1 text-xs leading-tight sm:mb-1.5 sm:text-caption lg:mx-0 lg:mb-3 lg:gap-2 lg:px-3 lg:py-1"
            >
              <Sparkles className="h-3 w-3 shrink-0 sm:h-3 sm:w-3 lg:h-3.5 lg:w-3.5" strokeWidth={1.6} aria-hidden />
              مسیر کمپین‌نویسی
            </Badge>
          </div>
          <h1 className="hero-panel-headline mt-1.5 whitespace-pre-line font-black tracking-[-0.02em] sm:mt-2 lg:mt-3">
            <span
              className="hero-headline-mobile md:hidden"
              style={{ fontSize: "var(--hero-headline-size, clamp(1.4rem, 6vw, 2rem))" }}
            >
              {site.hero.headlineMobile}
            </span>
            <span className="hero-headline-desktop hero-headline-gradient hidden md:inline lg:text-[clamp(2.15rem,2.6vw+1.1rem,3.5rem)] lg:leading-[1.24]">
              {site.hero.headline}
            </span>
          </h1>
          <p className="hero-panel-sub mx-auto mt-2 hidden max-w-2xl text-sm leading-relaxed sm:mt-3 sm:text-base md:block lg:mx-0 lg:mt-4 lg:text-body">
            {site.hero.sub}
          </p>
        </div>

        <div className="min-w-0 w-full lg:col-span-12 lg:col-start-1 lg:row-start-2 lg:self-start">
          <div className="hero-actions mx-auto w-full max-w-full sm:gap-2.5 lg:mx-0 lg:w-full lg:gap-4">
            <NeonBorder className="hero-actions-primary">
              <TrackedLinkButton
                href={site.ctaPrimary.href}
                event="homepage_cta_click"
                eventProps={{ cta: "hero_primary", location: "hero" }}
                variant="primary"
                withArrow
                size="lg"
                className="h-auto min-h-0 w-full min-w-0 px-4 py-2.5 text-sm sm:h-11 sm:min-h-11 sm:px-5 lg:h-14 lg:min-h-14 lg:min-w-52 lg:w-auto lg:shrink-0 lg:px-8 lg:text-base hover:!translate-y-0"
              >
                {site.ctaPrimary.label}
              </TrackedLinkButton>
            </NeonBorder>
            <TrackedLinkButton
              href={site.ctaSecondary.href}
              event="homepage_cta_click"
              eventProps={{ cta: "hero_saat", location: "hero" }}
              variant="ghost"
              size="lg"
              className="hero-ghost-cta h-auto min-h-0 w-full min-w-0 justify-center px-4 py-2.5 text-center text-sm backdrop-blur-md hover:-translate-y-px sm:h-11 sm:min-h-11 sm:px-5 lg:h-14 lg:min-h-14 lg:min-w-44 lg:w-auto lg:shrink-0 lg:px-8 lg:text-base"
            >
              {site.ctaSecondary.label}
            </TrackedLinkButton>
          </div>

          <div className="hero-stats-glass mx-auto mt-3 grid w-full max-w-full grid-cols-3 gap-1.5 rounded-card-lg px-2.5 py-3 sm:mt-5 sm:gap-2 sm:px-4 sm:py-5 lg:mt-8 lg:w-auto lg:max-w-none lg:px-6">
            <TrustStat divided icon={Users} value="700K+" label="مخاطب" />
            <TrustStat divided icon={GraduationCap} value="50K+" label="دانشجو" />
            <TrustStat icon={Mic2} value="10+" label="سال تجربه" />
          </div>
        </div>
      </div>
    </div>
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
        "hero-stat-item flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-center sm:flex-row sm:flex-none sm:justify-center sm:gap-3 sm:px-3",
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
        <p className="hero-stat-label mt-1 text-caption leading-snug">{label}</p>
      </div>
    </div>
  );
}
