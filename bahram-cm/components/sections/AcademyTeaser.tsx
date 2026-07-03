import { KeyRound, Lock, Sparkles } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { IconLabel } from "@/components/ui/IconLabel";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";
import { cn } from "@/lib/cn";

const PERKS = [
  { icon: KeyRound, label: "ورود انتخابی" },
  { icon: Lock, label: "فضای خصوصی" },
  { icon: Sparkles, label: "منتورینگ نزدیک" },
] as const;

export function AcademyTeaser() {
  return (
    <section
      aria-labelledby="academy-teaser-heading"
      className="academy-teaser-luxe relative isolate overflow-hidden border-t border-ink/12 bg-gradient-to-b from-gold via-gold to-[color-mix(in_oklab,var(--color-gold)_88%,var(--color-gold-soft))] py-8 shadow-[inset_0_1px_0_color-mix(in_oklab,var(--color-ink)_10%,transparent)] md:py-section"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_60%_at_100%_-5%,color-mix(in_oklab,var(--color-ink)_10%,transparent),transparent_62%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_45%_at_0%_105%,color-mix(in_oklab,var(--color-ink)_7%,transparent),transparent_68%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-gold-soft/[0.35] via-transparent to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-ink/20 to-transparent"
      />
      <div className="container-luxe relative grid min-w-0 max-w-full items-center gap-5 md:gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="min-w-0 max-w-full lg:col-span-7">
          <Reveal>
            <Eyebrow
              dotClassName="bg-bone"
              className="max-w-full rounded-pill border border-bone/12 bg-[color-mix(in_oklab,var(--color-charcoal)_88%,var(--color-gold))] px-2.5 py-1 text-[0.62rem] text-bone shadow-[0_1px_0_rgba(234,251,251,0.055)_inset,0_6px_16px_-8px_rgba(5,10,11,0.36)] ring-1 ring-bone/[0.08] backdrop-blur-sm sm:px-3.5 sm:py-1.5 sm:text-caption"
            >
              {site.academy.eyebrow}
            </Eyebrow>
          </Reveal>
          <Reveal delay={0.08}>
            <h2
              id="academy-teaser-heading"
              className="mt-3 max-w-3xl bg-gradient-to-l from-ink via-charcoal to-ink bg-clip-text text-h3 leading-[1.12] text-balance text-transparent md:leading-tight lg:mt-6 lg:text-h2"
            >
              {site.academy.title}
            </h2>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-3 max-w-2xl text-[0.9rem] leading-[1.62] text-ink/82 md:mt-5 md:text-base md:leading-relaxed lg:mt-6 lg:text-lg">
              <span className="lg:hidden">{site.academy.bodyMobile}</span>
              <span className="hidden lg:inline">{site.academy.body}</span>
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <ul
              className={cn(
                "mt-4 flex max-w-full md:mt-6",
                "max-lg:flex-row max-lg:flex-nowrap max-lg:items-center max-lg:gap-x-2 max-lg:overflow-x-auto max-lg:pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "max-lg:[&>li+li]:border-s max-lg:[&>li+li]:border-ink/12 max-lg:[&>li+li]:ps-2 max-lg:[&>li+li]:ms-2",
                "lg:mt-4 lg:flex-row lg:flex-wrap lg:gap-x-7 lg:gap-y-3 lg:overflow-visible",
              )}
            >
              {PERKS.map(({ icon, label }) => (
                <li key={label} className="min-w-0 shrink-0 lg:w-auto">
                  <span
                    className={cn(
                      "flex items-center lg:min-h-10",
                      "max-lg:gap-1",
                      "lg:w-auto lg:min-h-10 lg:rounded-xl lg:border lg:border-ink/12 lg:bg-ink/[0.05] lg:px-3 lg:py-2 lg:shadow-[0_1px_0_color-mix(in_oklab,var(--color-ink)_8%,transparent)_inset]",
                    )}
                  >
                    <IconLabel
                      icon={icon}
                      tone="gold"
                      className="gap-1.5 text-ink max-lg:gap-1 max-lg:text-[0.68rem] max-lg:leading-tight max-lg:[&_svg]:h-3.5 max-lg:[&_svg]:w-3.5 max-lg:[&_svg]:stroke-[1.5] lg:gap-2 lg:text-[0.95rem] lg:[&_svg]:h-4 lg:[&_svg]:w-4 lg:[&_svg]:stroke-[1.6]"
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
                href={site.academy.cta.href}
                variant="vip"
                size="lg"
                withArrow
                className={cn(
                  "w-full min-w-0 lg:w-auto",
                  "max-lg:h-11 max-lg:min-h-11 max-lg:text-[0.9rem]",
                  "!bg-ink !text-gold hover:!bg-charcoal hover:!text-gold-soft",
                )}
              >
                {site.academy.cta.label}
              </LinkButton>
              <LinkButton
                href="/academy/app"
                variant="ghost"
                size="lg"
                className={cn(
                  "w-full min-w-0 border-ink/22 !text-ink hover:border-ink/38 hover:!bg-ink/[0.07] lg:w-auto",
                  "max-lg:h-11 max-lg:min-h-11 max-lg:text-[0.9rem]",
                )}
              >
                دیدنِ اپ
              </LinkButton>
            </div>
          </Reveal>
        </div>

        <div className="min-w-0 max-w-full lg:col-span-5">
          <Reveal delay={0.16}>
            <div className="relative mx-auto w-full max-w-md min-w-0 px-0 pb-1 pt-1 lg:pb-8 lg:pt-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -end-4 top-20 hidden h-24 w-24 rounded-pill bg-ink/10 blur-2xl md:block"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -start-6 bottom-12 hidden h-28 w-28 rounded-pill bg-ink/8 blur-2xl md:block"
              />

              <div className="pointer-events-none absolute -start-5 -top-2 z-[3] hidden w-40 rotate-[-4deg] md:block lg:-start-10 lg:-top-8 lg:w-48">
                <PhotoFrame
                  ratio="square"
                  variant="soft"
                  rounded="card"
                  label="فضای آکادمی"
                  photoCaption="bottom"
                  className="border-ink/18 shadow-xl shadow-black/25 ring-1 ring-ink/10"
                  showIcon={false}
                  src={sitePhotos.academyAccent}
                  alt="فضای آکادمی"
                />
              </div>

              <div className="relative z-[2] mx-auto w-full min-w-0 max-w-[13.75rem] sm:max-w-[15.25rem] md:max-w-[19rem] lg:max-w-[17rem]">
                <PhotoFrame
                  ratio="story"
                  variant="radial"
                  rounded="card-lg"
                  label="نمای اپ آکادمی"
                  badge="پیش‌نمایش"
                  className="border-ink/18 shadow-black/25 neon-surface-framed ring-1 ring-ink/12"
                  src={sitePhotos.academyStory}
                  alt="پیش‌نمایش اپلیکیشن آکادمی روی موبایل"
                  photoCaption="none"
                />
              </div>

              <div className="relative z-[4] mx-auto mt-4 flex justify-center px-2 sm:mt-6 lg:mt-10">
                <span className="rounded-pill border border-ink/22 bg-ink/88 px-3 py-1 text-[0.65rem] leading-none text-gold shadow-md shadow-black/20 backdrop-blur-md sm:text-caption">
                  VIP · فقط اعضای آکادمی
                </span>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
