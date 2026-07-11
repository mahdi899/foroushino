import { BarChart3, Bell, Coins } from "lucide-react";
import { SiteImage } from "@/components/ui/SiteImage";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { cn } from "@/lib/cn";
import { sitePhotos } from "@/lib/site-photo-paths";

const metrics = [
  {
    icon: BarChart3,
    label: "گزارش فروش",
    value: "۳۲ تماس موفق",
    floatClass: "academy-teaser-metric-float--sales",
    toneClass: "academy-teaser-metric--emerald",
  },
  {
    icon: Bell,
    label: "یادآوری پیگیری",
    value: "۴ مورد امروز",
    floatClass: "academy-teaser-metric-float--reminder",
    toneClass: "academy-teaser-metric--gold",
  },
  {
    icon: Coins,
    label: "کمیسیون",
    value: "۲,۴۵۰,۰۰۰ ت",
    floatClass: "academy-teaser-metric-float--commission",
    toneClass: "academy-teaser-metric--mint",
  },
] as const;

function MetricCard({
  icon: Icon,
  label,
  value,
  toneClass,
  variant = "default",
  className,
}: {
  icon: typeof metrics[number]["icon"];
  label: string;
  value: string;
  toneClass?: string;
  variant?: "default" | "float";
  className?: string;
}) {
  const isFloat = variant === "float";

  return (
    <div
      className={cn(
        "academy-teaser-metric",
        toneClass,
        isFloat ? "academy-teaser-metric--float" : "academy-teaser-metric--stack",
        className,
      )}
    >
      <span className="academy-teaser-metric-icon" aria-hidden>
        <Icon className="h-4 w-4" strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("academy-teaser-metric-label", isFloat && "academy-teaser-metric-label--float")}>
          {label}
        </p>
        <p className={cn("academy-teaser-metric-value", isFloat && "academy-teaser-metric-value--float")}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function AcademyTeaser() {
  const [titleBrand, titleTagline] = site.saat.teaserTitle.split("|").map((part) => part.trim());

  return (
    <section
      aria-labelledby="saat-teaser-heading"
      className="academy-teaser-luxe relative isolate py-8 md:py-10 lg:py-12"
    >
      <div className="container-luxe">
        <Reveal>
          <div className="academy-teaser-banner relative overflow-visible p-4 sm:p-5 md:p-7 lg:rounded-card-lg lg:p-8 xl:p-10">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 overflow-hidden lg:rounded-card-lg"
            >
              <div className="academy-teaser-accent-bar absolute inset-y-6 start-0 z-[2] w-[3px] rounded-full lg:inset-y-8" />
              <div className="academy-teaser-ambient absolute inset-0" />
              <div className="academy-teaser-waves absolute inset-0" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/25 to-transparent" />
            </div>

            <div className="relative grid min-w-0 grid-cols-1 gap-5 overflow-visible sm:gap-8 lg:grid-cols-2 lg:items-center lg:gap-10 xl:gap-14">
              <div className="academy-teaser-copy order-2 flex min-w-0 flex-col items-center justify-center lg:order-1 lg:items-stretch lg:pe-2 xl:pe-4">
                <div className="academy-teaser-copy-header w-full max-w-none text-center lg:text-start">
                  <Eyebrow
                    dotClassName="bg-emerald-glow"
                    className="academy-teaser-eyebrow hidden md:inline-flex"
                  >
                    {site.saat.eyebrow}
                  </Eyebrow>
                  <h2
                    id="saat-teaser-heading"
                    className="mt-0 font-display font-black leading-[1.12] tracking-[-0.022em] sm:mt-4 lg:mt-4"
                  >
                    <span className="block text-[2.375rem] leading-[1.18] sm:text-[2.625rem] lg:text-[clamp(2rem,2.8vw+1rem,3.25rem)] lg:leading-[1.15] text-gold">
                      {titleBrand}
                    </span>
                    {titleTagline ? (
                      <span className="mt-1 block text-[clamp(1rem,2.5vw+0.65rem,1.25rem)] font-bold leading-[1.35] text-bone lg:text-[clamp(1.125rem,1.2vw+0.82rem,1.625rem)]">
                        {titleTagline}
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-3 max-w-[33.75rem] text-pretty text-[0.875rem] font-normal leading-[1.75] text-bone-dim sm:mt-4 sm:text-sm md:text-[0.9375rem] lg:max-w-none xl:max-w-[34rem]">
                    {site.saat.teaserLead}
                  </p>
                </div>

                <div className="mt-5 flex w-full flex-col items-center gap-3 sm:mt-6 md:items-start lg:mt-8">
                  <LinkButton
                    href={site.saat.cta.href}
                    variant="primary"
                    size="lg"
                    withArrow
                    className="w-full justify-center px-8 font-semibold md:w-auto md:justify-start"
                  >
                    {site.saat.cta.label}
                  </LinkButton>
                </div>
              </div>

              <div className="academy-teaser-showcase order-1 flex min-h-0 items-center justify-center overflow-visible pb-1 pt-0 md:py-4 lg:order-2 lg:justify-start lg:py-6">
                <div dir="ltr" className="academy-teaser-showcase-inner relative w-fit">
                  <SiteImage
                    src={sitePhotos.academyAppHome}
                    alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                    width={620}
                    height={820}
                    wrapperClassName="overflow-visible"
                    className="academy-teaser-screenshot mx-auto h-auto w-[min(calc(100vw-2rem),18.5rem)] min-[400px]:w-[19.5rem] sm:w-[21rem] md:w-[21.5rem] lg:mx-0 lg:w-[23rem] xl:w-[24.5rem]"
                    sizes="(max-width: 640px) 82vw, (max-width: 1023px) 40vw, 392px"
                  />

                  {metrics.map(({ icon, label, value, floatClass, toneClass }, index) => (
                    <MetricCard
                      key={label}
                      icon={icon}
                      label={label}
                      value={value}
                      toneClass={toneClass}
                      variant="float"
                      className={cn(
                        "academy-teaser-metric-float pointer-events-auto absolute z-[2] hidden md:flex",
                        floatClass,
                        index === 1 && "academy-teaser-metric-float--delay-1",
                        index === 2 && "academy-teaser-metric-float--delay-2",
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
