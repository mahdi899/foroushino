import { BarChart3, Bell, Coins, Phone } from "lucide-react";
import Image from "next/image";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
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
          <div className="academy-teaser-banner relative overflow-hidden rounded-card-lg bg-gradient-to-br from-gold via-[#ffc108] to-gold-soft p-5 md:p-7 lg:p-8 xl:p-10">
            <div
              aria-hidden
              className="academy-teaser-waves pointer-events-none absolute inset-0"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/45 to-transparent"
            />

            <div className="relative grid items-center gap-8 lg:grid-cols-12 lg:gap-6 xl:gap-8">
              <div className="academy-teaser-copy flex min-w-0 flex-col justify-center lg:col-span-6 lg:pe-2 xl:pe-4">
                <div className="academy-teaser-copy-header">
                  <span className="academy-teaser-eyebrow inline-flex w-fit items-center rounded-pill border border-[var(--on-gold-border)] bg-[color-mix(in_oklab,white_42%,transparent)] px-3 py-1 text-caption font-semibold tracking-[0.16em] text-[var(--on-gold-ink-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]">
                    {site.saat.eyebrow}
                  </span>
                  <h2
                    id="saat-teaser-heading"
                    className="mt-4 font-display font-black leading-[1.15] tracking-[-0.022em] text-[var(--on-gold-ink-strong)]"
                  >
                    <span className="block text-[clamp(1.75rem,2.2vw+1rem,2.625rem)]">{titleBrand}</span>
                    {titleTagline ? (
                      <span className="mt-1 block text-[clamp(1.125rem,1.2vw+0.82rem,1.625rem)] font-bold leading-[1.35] text-[var(--on-gold-ink-strong)]">
                        {titleTagline}
                      </span>
                    ) : null}
                  </h2>
                  <p className="mt-4 max-w-[36ch] text-pretty text-sm font-medium leading-[1.8] text-[var(--on-gold-ink-muted)] md:text-[0.9375rem]">
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
                    className="teaser-ghost-cta w-full px-8 font-semibold sm:w-auto"
                  >
                    {site.saat.ctaSecondary.label}
                  </LinkButton>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:col-span-3 lg:gap-3.5">
                {metrics.map(({ icon: Icon, label, value }) => (
                  <div key={label} className="academy-teaser-metric flex items-center gap-3 rounded-[1.125rem] px-4 py-3.5 sm:py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[var(--on-gold-ink-strong)]">{label}</p>
                      <p className="mt-1 text-xs font-medium text-[var(--on-gold-ink-muted)] sm:text-[0.8125rem]">
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
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.22),transparent_62%)]"
                />
                <div dir="ltr" className="relative w-[min(100%,14.5rem)] sm:w-[15.5rem] lg:w-[14.75rem] xl:w-[15.5rem]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-[var(--on-gold-ink)]/10 blur-3xl"
                  />
                  <div className="academy-teaser-phone relative overflow-hidden rounded-[1.75rem] shadow-[0_28px_64px_-24px_rgba(5,10,11,0.42)] ring-1 ring-white/35">
                    <div className="relative aspect-[9/19] w-full">
                      <Image
                        src={sitePhotos.academyStory}
                        alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 768px) 55vw, 300px"
                      />
                    </div>
                    <span className="absolute start-3 top-3 inline-flex items-center gap-1.5 rounded-pill bg-white/92 px-2.5 py-1 text-[0.6875rem] font-bold text-[var(--on-gold-ink-strong)] shadow-sm backdrop-blur-sm">
                      <Phone className="h-3 w-3" strokeWidth={2} aria-hidden />
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
