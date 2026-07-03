import { KeyRound } from "lucide-react";
import { site } from "@/content/site";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Reveal } from "@/components/motion/Reveal";
import { SectionMotif } from "@/components/ui/SectionMotif";
import { IconTile } from "@/components/ui/IconTile";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export function FinalCTA() {
  return (
    <section className="py-section-sm md:py-section">
      <div className="container-luxe">
        <div className="neon-cta-slab relative rounded-card border border-emerald/25 bg-gradient-to-b from-emerald-deep/45 via-charcoal/70 to-ink p-4 sm:p-8 md:p-12 lg:p-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-card"
          >
            <div className="absolute inset-0 bg-[radial-gradient(70%_70%_at_85%_10%,rgba(0,140,150,0.22),transparent_70%)]" />
          </div>
          <div className="relative z-[1] grid items-start gap-5 md:gap-10 lg:grid-cols-12 lg:items-center lg:gap-x-14 lg:gap-y-8">
            <div className="min-w-0 lg:col-span-7 lg:row-start-1">
              <Reveal>
                <SectionMotif className="mb-5 md:mb-10" />
              </Reveal>
              <Reveal delay={0.06}>
                <IconTile
                  icon={KeyRound}
                  tone="gold"
                  size="md"
                  className="md:h-16 md:w-16 md:[&_svg]:h-7 md:[&_svg]:w-7"
                />
              </Reveal>
              <Reveal delay={0.12}>
                <h2 className="mt-4 max-md:whitespace-normal md:mt-8 md:whitespace-pre-line md:text-h1 lg:text-display text-h2 text-balance">
                  {site.finalCta.title}
                </h2>
              </Reveal>
              <Reveal delay={0.2}>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-bone-dim md:mt-6 md:text-body">
                  {site.finalCta.body}
                </p>
              </Reveal>
            </div>

            <Reveal
              delay={0.14}
              className="min-w-0 lg:col-span-5 lg:row-span-2 lg:row-start-1 lg:self-center"
            >
              <div className="relative mx-auto w-full max-w-md lg:ms-auto lg:me-0">
                <PhotoFrame
                  ratio="portrait"
                  variant="radial"
                  rounded="card-lg"
                  badge="مسیر ورود"
                  label="آغاز مسیر حرفه‌ای"
                  className="shadow-frame max-md:aspect-[16/11] md:aspect-[4/5]"
                  src={sitePhotos.ctaPortrait}
                  alt="آغاز مسیر حرفه‌ای"
                />
                <div className="absolute -end-4 -bottom-5 hidden w-[42%] md:block lg:-end-6 lg:-bottom-6">
                  <PhotoFrame
                    ratio="square"
                    variant="grid"
                    rounded="card"
                    label="آکادمی"
                    showIcon={false}
                    className="rotate-[3deg]"
                    src={sitePhotos.ctaSquare}
                    alt="آکادمی"
                  />
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.28} className="min-w-0 lg:col-span-7 lg:row-start-2 lg:justify-self-start">
              <div className="flex w-full flex-col items-stretch gap-3 pb-3 lg:flex-row lg:flex-wrap lg:items-center lg:gap-4 lg:pb-0 lg:pt-10">
                <TrackedLinkButton
                  href={site.finalCta.cta.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_primary", location: "final_cta" }}
                  variant="sales"
                  size="lg"
                  withArrow
                  className="h-12 min-h-12 w-full min-w-0 px-5 text-[0.88rem] md:h-14 md:min-h-14 md:w-auto md:shrink-0 md:px-7 md:text-base"
                >
                  {site.finalCta.cta.label}
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/apply"
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_apply", location: "final_cta" }}
                  variant="sales"
                  size="lg"
                  withArrow
                  className="h-12 min-h-12 w-full min-w-0 px-5 text-[0.88rem] md:h-14 md:min-h-14 md:w-auto md:shrink-0 md:px-7 md:text-base"
                >
                  درخواست ورود به آکادمی
                </TrackedLinkButton>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
