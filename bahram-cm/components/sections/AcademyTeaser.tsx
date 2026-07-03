import { Phone, ClipboardList, TrendingUp } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconLabel } from "@/components/ui/IconLabel";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";
import { cn } from "@/lib/cn";

const PERK_ICONS = [Phone, ClipboardList, TrendingUp] as const;

export function AcademyTeaser() {
  const perks = site.saat.perks.map((label, i) => ({
    icon: PERK_ICONS[i] ?? Phone,
    label,
  }));

  return (
    <section
      aria-labelledby="saat-teaser-heading"
      className="academy-teaser-luxe relative isolate overflow-hidden border-t border-[var(--on-gold-border)] bg-gradient-to-b from-gold via-gold to-[color-mix(in_oklab,var(--color-gold)_82%,var(--color-gold-soft))] py-8 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--on-gold-ink)_8%,transparent)] md:py-section"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_100%_-5%,color-mix(in_oklab,var(--on-gold-ink)_7%,transparent),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_0%_105%,color-mix(in_oklab,var(--on-gold-ink)_5%,transparent),transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-soft/[0.35] via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-[var(--on-gold-border)] to-transparent"
      />
      <div className="container-luxe relative grid min-w-0 max-w-full items-center gap-5 md:gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 max-w-full lg:col-span-7">
          <Reveal>
            <Eyebrow
              dotClassName="bg-[var(--on-gold-ink-strong)]"
              className="max-w-full rounded-pill border border-[var(--on-gold-border)] bg-[var(--on-gold-badge)] px-2.5 py-1 text-caption text-[var(--on-gold-ink-strong)] shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_6px_16px_-8px_rgba(5,10,11,0.18)] ring-1 ring-[color-mix(in_oklab,var(--on-gold-ink)_8%,transparent)] backdrop-blur-sm sm:px-3.5 sm:py-1.5"
            >
              {site.saat.eyebrow}
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2
              id="saat-teaser-heading"
              className="mt-3 max-w-3xl bg-gradient-to-l from-[var(--on-gold-ink-strong)] via-[var(--on-gold-ink)] to-[var(--on-gold-ink-strong)] bg-clip-text text-h3 text-balance text-transparent lg:mt-6 lg:text-h2"
            >
              {site.saat.title}
            </h2>
          </Reveal>
          <Reveal delay={0.12}>
            <p className="mt-3 max-w-2xl text-sm font-medium text-[color-mix(in_oklab,var(--on-gold-ink)_88%,transparent)] md:mt-4 md:text-body lg:mt-5">
              {site.saat.subtitle}
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-2 max-w-2xl text-sm text-[color-mix(in_oklab,var(--on-gold-ink)_82%,transparent)] md:mt-4 md:text-body lg:mt-5">
              <span className="lg:hidden">{site.saat.bodyMobile}</span>
              <span className="hidden lg:inline">{site.saat.body}</span>
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <ul
              className={cn(
                "mt-4 flex max-w-full md:mt-6",
                "max-lg:flex-row max-lg:flex-nowrap max-lg:items-center max-lg:gap-x-2 max-lg:overflow-x-auto max-lg:pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "max-lg:[&>li+li]:border-s max-lg:[&>li+li]:border-[var(--on-gold-border)] max-lg:[&>li+li]:ps-2 max-lg:[&>li+li]:ms-2",
                "lg:mt-4 lg:flex-row lg:flex-wrap lg:gap-x-7 lg:gap-y-3 lg:overflow-visible",
              )}
            >
              {perks.map(({ icon, label }) => (
                <li key={label} className="min-w-0 shrink-0 lg:w-auto">
                  <span
                    className={cn(
                      "flex items-center lg:min-h-10",
                      "max-lg:gap-1",
                      "lg:w-auto lg:min-h-10 lg:rounded-xl lg:border lg:border-[var(--on-gold-border)] lg:bg-[var(--on-gold-fill)] lg:px-3 lg:py-2 lg:shadow-[0_1px_0_color-mix(in_oklab,var(--on-gold-ink)_8%,transparent)_inset]",
                    )}
                  >
                    <IconLabel
                      icon={icon}
                      tone="gold"
                      className="gap-1.5 text-[var(--on-gold-ink)] max-lg:gap-1 max-lg:text-caption max-lg:leading-tight max-lg:[&_svg]:h-3.5 max-lg:[&_svg]:w-3.5 max-lg:[&_svg]:stroke-[1.5] lg:gap-2 lg:text-sm lg:[&_svg]:h-4 lg:[&_svg]:w-4 lg:[&_svg]:stroke-[1.6]"
                    >
                      {label}
                    </IconLabel>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.28}>
            <div className="mt-5 flex w-full max-w-md flex-col gap-2.5 sm:max-w-none sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:mt-10">
              <LinkButton
                href={site.saat.cta.href}
                variant="primary"
                size="lg"
                withArrow
                className={cn(
                  "w-full min-w-0 lg:w-auto",
                  "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm",
                )}
              >
                {site.saat.cta.label}
              </LinkButton>
              <LinkButton
                href={site.saat.ctaSecondary.href}
                variant="ghost"
                size="lg"
                className={cn(
                  "w-full min-w-0 lg:w-auto",
                  "max-lg:h-11 max-lg:min-h-11 max-lg:text-sm",
                  "border-emerald/30 !text-emerald-glow hover:border-emerald/45 hover:!bg-emerald/10",
                )}
              >
                {site.saat.ctaSecondary.label}
              </LinkButton>
            </div>
          </Reveal>
        </div>

        <div className="min-w-0 max-w-full lg:col-span-5">
          <Reveal delay={0.16}>
            <div className="relative mx-auto w-full max-w-md min-w-0 px-0 pb-1 pt-1 lg:pb-8 lg:pt-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -end-4 top-20 hidden h-24 w-24 rounded-pill bg-[var(--on-gold-fill)] blur-2xl md:block"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -start-6 bottom-12 hidden h-28 w-28 rounded-pill bg-[color-mix(in_oklab,var(--on-gold-ink)_5%,transparent)] blur-2xl md:block"
              />

              <div className="pointer-events-none absolute -start-5 -top-2 z-[3] hidden w-40 rotate-[-4deg] md:block lg:-start-10 lg:-top-8 lg:w-48">
                <PhotoFrame
                  ratio="square"
                  variant="soft"
                  rounded="card"
                  label="فضای تیم فروش"
                  photoCaption="bottom"
                  className="border-[var(--on-gold-border)] shadow-xl shadow-black/15 ring-1 ring-[color-mix(in_oklab,var(--on-gold-ink)_10%,transparent)]"
                  showIcon={false}
                  src={sitePhotos.academyAccent}
                  alt="فضای تیم فروش"
                />
              </div>

              <div className="relative z-[2] mx-auto w-full min-w-0 max-w-[13.75rem] sm:max-w-[15.25rem] md:max-w-[19rem] lg:max-w-[17rem]">
                <PhotoFrame
                  ratio="story"
                  variant="radial"
                  rounded="card-lg"
                  label="پیش‌نمایش اپ"
                  badge="پیش‌نمایش اپ"
                  className="border-[var(--on-gold-border)] shadow-black/15 neon-surface-framed ring-1 ring-[color-mix(in_oklab,var(--on-gold-ink)_12%,transparent)]"
                  src={sitePhotos.academyStory}
                  alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                  photoCaption="none"
                />
              </div>

              <div className="relative z-[4] mx-auto mt-4 flex justify-center px-2 sm:mt-6 lg:mt-10">
                <span className="rounded-pill border border-[var(--on-gold-border)] bg-[color-mix(in_oklab,var(--on-gold-ink-strong)_90%,transparent)] px-3 py-1 text-caption leading-none text-gold shadow-md shadow-black/12 backdrop-blur-md">
                  {site.tagline}
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
