import { site } from "@/content/site";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCTA() {
  return (
    <section aria-labelledby="final-cta-heading" className="final-cta-band">
      <div className="neon-cta-slab relative border-y border-[#002428]/80 bg-gradient-to-br from-[#001a1d] via-[#003b40] to-[#005a61] py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_48px_-20px_rgba(0,0,0,0.55)] sm:py-6 md:py-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(65%_120%_at_100%_50%,rgba(0,140,150,0.12),transparent_62%)]"
        />
        <div className="container-luxe relative z-[1]">
          <Reveal>
            <div className="final-cta-layout flex min-w-0 flex-col gap-5 sm:gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="final-cta-copy flex min-w-0 flex-1 flex-col gap-2.5 sm:gap-3">
                <h2
                  id="final-cta-heading"
                  className="whitespace-pre-line text-balance font-display text-[1.0625rem] font-bold leading-[1.35] tracking-[-0.02em] text-white sm:text-lg md:text-xl"
                >
                  {site.finalCta.title.trim()}
                </h2>
                <p className="min-w-0 text-pretty text-sm leading-[1.7] text-white/72 sm:text-[0.9375rem] md:text-base lg:max-w-[42rem]">
                  {site.finalCta.body}
                </p>
              </div>

              <div className="final-cta-actions flex w-full min-w-0 shrink-0 flex-col gap-2.5 sm:max-w-md sm:flex-row sm:gap-3 lg:w-auto lg:max-w-[24rem] lg:flex-col xl:max-w-[26rem] xl:flex-row xl:gap-2.5">
                <TrackedLinkButton
                  href={site.finalCta.cta.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_primary", location: "final_cta" }}
                  variant="vip"
                  size="md"
                  withArrow
                  className="min-h-11 w-full justify-center px-3.5 text-center text-sm leading-snug sm:flex-1 sm:px-4 sm:text-[0.9375rem] lg:flex-none xl:flex-1"
                >
                  {site.finalCta.cta.label}
                </TrackedLinkButton>
                <TrackedLinkButton
                  href="/apply"
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_apply", location: "final_cta" }}
                  variant="vip"
                  size="md"
                  withArrow
                  className="min-h-11 w-full justify-center px-3.5 text-center text-sm leading-snug sm:flex-1 sm:px-4 sm:text-[0.9375rem] lg:flex-none xl:flex-1"
                >
                  درخواست ورود به آکادمی
                </TrackedLinkButton>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
