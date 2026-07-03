import { Phone, ClipboardList, TrendingUp } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

const PERK_ICONS = [Phone, ClipboardList, TrendingUp] as const;

export function AcademyTeaser() {
  const perks = site.saat.perks.map((label, i) => ({
    icon: PERK_ICONS[i] ?? Phone,
    label,
  }));

  return (
    <section
      aria-labelledby="saat-teaser-heading"
      className="academy-teaser-luxe relative isolate overflow-hidden border-t border-[var(--on-gold-border)] bg-gradient-to-br from-gold via-[#ffc108] to-gold-soft py-7 md:py-9 lg:py-10"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_0%_100%,color-mix(in_oklab,var(--on-gold-ink)_6%,transparent),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-white/50 to-transparent"
      />

      <div className="container-luxe relative">
        <div className="grid min-w-0 items-stretch gap-7 lg:grid-cols-12 lg:gap-8 xl:gap-12">
          <div className="min-w-0 lg:col-span-6 xl:col-span-7">
            <div className="academy-teaser-editorial relative overflow-hidden rounded-card-lg p-5 md:p-7 lg:p-8">
              <span
                aria-hidden
                className="academy-teaser-accent-bar pointer-events-none absolute"
              />
              <span
                aria-hidden
                className="academy-teaser-editorial-glow pointer-events-none absolute"
              />

              <div className="academy-teaser-copy relative z-[1]">
                <Reveal>
                  <Eyebrow className="academy-teaser-eyebrow">{site.saat.eyebrow}</Eyebrow>
                </Reveal>
                <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)] lg:items-end lg:gap-7">
                  <Reveal delay={0.05}>
                    <h2
                      id="saat-teaser-heading"
                      className="max-w-[22ch] text-balance font-display text-[clamp(1.625rem,2vw+1rem,2.5rem)] font-black leading-[1.32] tracking-[-0.018em] text-[var(--on-gold-ink-strong)] md:leading-[1.36]"
                    >
                      {site.saat.teaserTitle}
                    </h2>
                  </Reveal>
                  <Reveal delay={0.08}>
                    <p className="max-w-[38ch] text-pretty text-sm font-medium leading-[1.7] text-[var(--on-gold-ink-muted)] lg:text-[0.9375rem] lg:leading-[1.75]">
                      {site.saat.teaserLead}
                    </p>
                  </Reveal>
                </div>
              </div>

              <Reveal delay={0.12}>
                <ul className="academy-teaser-features relative z-[1] mt-5 grid grid-cols-1 gap-2.5 sm:mt-6 sm:grid-cols-3 sm:gap-6 lg:mt-7 lg:gap-8">
                  {perks.map(({ icon: Icon, label }, index) => (
                    <li
                      key={label}
                      className="academy-teaser-feature flex min-h-[4.75rem] min-w-0 flex-col justify-center gap-2.5 rounded-[0.875rem] border border-[color-mix(in_oklab,var(--on-gold-ink)_8%,transparent)] bg-[color-mix(in_oklab,white_24%,transparent)] px-3.5 py-3 sm:min-h-[5.25rem] sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:py-2 lg:min-h-[5.5rem]"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="academy-teaser-feature-index num-latin shrink-0 text-[0.6875rem] font-semibold tracking-[0.2em]">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--on-gold-border)] bg-[color-mix(in_oklab,white_46%,transparent)] text-[var(--on-gold-ink-strong)] shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]">
                          <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                        </span>
                      </div>
                      <span className="min-w-0 text-sm font-semibold leading-snug text-[var(--on-gold-ink-strong)]">
                        {label}
                      </span>
                    </li>
                  ))}
                </ul>
              </Reveal>

              <Reveal delay={0.16}>
                <div className="academy-teaser-actions relative z-[1] mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:items-center sm:gap-3 lg:mt-7">
                  <LinkButton
                    href={site.saat.cta.href}
                    variant="primary"
                    size="lg"
                    withArrow
                    className="h-11 min-h-11 w-full min-w-0 text-sm font-semibold sm:w-auto"
                  >
                    {site.saat.cta.label}
                  </LinkButton>
                  <LinkButton
                    href={site.saat.ctaSecondary.href}
                    variant="ghost"
                    size="lg"
                    className="teaser-ghost-cta h-11 min-h-11 w-full min-w-0 text-sm font-semibold sm:w-auto"
                  >
                    {site.saat.ctaSecondary.label}
                  </LinkButton>
                </div>
              </Reveal>
            </div>
          </div>

          <div className="flex min-w-0 items-center justify-center lg:col-span-6 lg:justify-end xl:col-span-5">
            <Reveal delay={0.1}>
              <div
                dir="ltr"
                className="flex items-center justify-center gap-2.5 sm:gap-3 md:gap-4"
              >
                <div className="relative w-[13.5rem] sm:w-[15rem] lg:w-[16.5rem] xl:w-[17.5rem]">
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-5 rounded-[2rem] bg-[var(--on-gold-ink)]/12 blur-3xl"
                  />
                  <PhotoFrame
                    ratio="story"
                    variant="radial"
                    rounded="card-lg"
                    badge="سات"
                    interactive
                    neonTone="gold"
                    className="relative z-[1] w-full shadow-[0_28px_64px_-24px_rgba(5,10,11,0.45)]"
                    src={sitePhotos.academyStory}
                    alt="پیش‌نمایش مینی‌اپ سات روی موبایل"
                    photoCaption="none"
                    sizes="(max-width: 768px) 45vw, 280px"
                  />
                </div>

                <div className="hidden shrink-0 flex-col gap-3 sm:flex md:gap-3.5 lg:gap-4">
                  <div className="w-[8.5rem] rotate-[-4deg] md:w-[9.25rem] lg:w-[10.25rem] xl:w-[11rem]">
                    <PhotoFrame
                      ratio="square"
                      variant="soft"
                      rounded="card"
                      photoCaption="none"
                      showIcon={false}
                      interactive
                      neonTone="gold"
                      src={sitePhotos.academyAccent}
                      alt="فضای تیم فروش"
                    />
                  </div>
                  <div className="w-[8.5rem] rotate-[3deg] md:w-[9.25rem] lg:w-[10.25rem] xl:w-[11rem]">
                    <PhotoFrame
                      ratio="landscape"
                      variant="grid"
                      rounded="card"
                      photoCaption="none"
                      showIcon={false}
                      interactive
                      neonTone="gold"
                      src={sitePhotos.squareBackstage}
                      alt="پشت صحنه فروش"
                    />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
