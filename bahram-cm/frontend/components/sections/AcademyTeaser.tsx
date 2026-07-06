import { BarChart3, Bell, Coins, Phone } from "lucide-react";
import { SiteImage } from "@/components/ui/SiteImage";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";

const metrics = [
  { icon: BarChart3, label: "گزارش فروش", value: "۳۲ تماس موفق" },
  { icon: Bell, label: "یادآوری پیگیری", value: "۴ مورد امروز" },
  { icon: Coins, label: "کمیسیون", value: "۲,۴۵۰,۰۰۰ ت" },
] as const;

export function AcademyTeaser() {
  const [titleBrand, titleTagline] = site.saat.teaserTitle.split("|").map((part) => part.trim());

  return (
    <section
      aria-labelledby="saat-teaser-heading"
      className="academy-teaser-luxe relative isolate py-8 md:py-10 lg:py-12"
    >
      <div className="container-luxe">
        <Reveal>
          <div className="academy-teaser-banner relative overflow-hidden rounded-card-lg p-5 md:p-7 lg:p-8 xl:p-10">
            <div
              aria-hidden
              className="academy-teaser-accent-bar pointer-events-none absolute inset-y-6 start-0 z-[2] w-[3px] rounded-full lg:inset-y-8"
            />
            <div
              aria-hidden
              className="academy-teaser-ambient pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="academy-teaser-waves pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-gold/25 to-transparent"
            />

            <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-6 xl:gap-8">
              <div className="academy-teaser-copy flex min-w-0 flex-col justify-center ps-1 lg:col-span-6 lg:pe-2 lg:ps-2 xl:pe-4">
                <div className="academy-teaser-copy-header">
                  <Eyebrow dotClassName="bg-emerald-glow">{site.saat.eyebrow}</Eyebrow>
                  <h2
                    id="saat-teaser-heading"
                    className="mt-4 font-display font-black leading-[1.15] tracking-[-0.022em]"
                  >
                    <span className="block text-[clamp(1.75rem,2.2vw+1rem,2.625rem)] text-gold">
                      {titleBrand}
                    </span>
                    {titleTagline ? (
                      <span className="mt-1 block text-[clamp(1.125rem,1.2vw+0.82rem,1.625rem)] font-bold leading-[1.35] text-bone">
                        {titleTagline}
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-4 max-w-[36ch] text-pretty text-sm font-normal leading-[1.8] text-bone-dim md:text-[0.9375rem]">
                    {site.saat.teaserLead}
                  </p>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
                  <LinkButton
                    href={site.saat.cta.href}
                    variant="primary"
                    size="lg"
                    withArrow
                    className="w-full px-8 font-semibold sm:w-auto"
                  >
                    {site.saat.cta.label}
                  </LinkButton>
                  <LinkButton
                    href={site.saat.ctaSecondary.href}
                    variant="ghost"
                    size="lg"
                    className="w-full px-8 font-semibold sm:w-auto"
                  >
                    {site.saat.ctaSecondary.label}
                  </LinkButton>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-3 lg:gap-3.5">
                {metrics.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="academy-teaser-metric flex items-center gap-3 rounded-[1.125rem] px-4 py-3.5 sm:py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-bone">{label}</p>
                      <p className="mt-1 text-xs font-normal text-bone-dim sm:text-[0.8125rem]">
                        {value}
                      </p>
                    </div>
                    <span className="academy-teaser-metric-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
                    </span>
                  </div>
                ))}
              </div>

              <div className="relative flex items-center justify-center lg:col-span-3 lg:justify-end">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,color-mix(in_oklab,var(--color-emerald-glow)_14%,transparent),transparent_62%)]"
                />
                <div dir="ltr" className="relative w-[min(100%,14.5rem)] sm:w-[15.5rem] lg:w-[14.75rem] xl:w-[15.5rem]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-emerald-glow/10 blur-3xl"
                  />
                  <div className="academy-teaser-phone relative overflow-hidden rounded-[1.75rem] ring-1 ring-bone/10">
                    <div className="relative aspect-[9/19] w-full">
                      <SiteImage
                        src={sitePhotos.academyStory}
                        alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 768px) 55vw, 300px"
                      />
                    </div>
                    <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-pill border border-bone/10 bg-charcoal/80 px-2.5 py-1 text-[0.6875rem] font-bold text-bone backdrop-blur-md">
                      <Phone className="h-3 w-3 text-emerald-glow" strokeWidth={2} aria-hidden />
                      سات
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
