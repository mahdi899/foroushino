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
            <div className="final-cta-layout flex min-w-0 flex-col gap-5 sm:gap-6 xl:flex-row xl:items-center xl:justify-between xl:gap-8 2xl:gap-10">
              <div className="final-cta-copy flex min-w-0 flex-col gap-2.5 sm:gap-3 2xl:max-w-[58%] 2xl:flex-row 2xl:items-center 2xl:gap-8">
                <h2
                  id="final-cta-heading"
                  className="whitespace-pre-line text-balance font-display text-[1.0625rem] font-bold leading-[1.35] tracking-[-0.02em] text-white sm:text-lg md:text-xl 2xl:max-w-[11.5rem] 2xl:shrink-0"
                >
                  {site.finalCta.title.trim()}
                </h2>
                <p className="min-w-0 text-pretty text-sm leading-[1.7] text-white/72 sm:text-[0.9375rem] md:text-base 2xl:max-w-[36ch] 2xl:border-s 2xl:border-white/12 2xl:ps-8">
                  {site.finalCta.body}
                </p>
              </div>

              <div className="final-cta-actions grid w-full min-w-0 grid-cols-1 gap-2.5 min-[420px]:grid-cols-2 xl:w-auto xl:max-w-[26rem] xl:shrink-0 2xl:max-w-none 2xl:grid-cols-2">
                <TrackedLinkButton
                  href={site.finalCta.cta.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_primary", location: "final_cta" }}
                  variant="vip"
                  size="md"
                  withArrow
                  className="min-h-11 w-full justify-center px-3.5 text-center text-sm leading-snug sm:px-4 sm:text-[0.9375rem]"
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
                  className="min-h-11 w-full justify-center px-3.5 text-center text-sm leading-snug sm:px-4 sm:text-[0.9375rem]"
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
