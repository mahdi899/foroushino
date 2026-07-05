import { site } from "@/content/site";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Reveal } from "@/components/motion/Reveal";

export function FinalCTA() {
  const title = site.finalCta.title.replace(/\n+/g, " ").trim();

  return (
    <section aria-labelledby="final-cta-heading" className="final-cta-band">
      <div className="neon-cta-slab relative border-y border-[#002428]/80 bg-gradient-to-br from-[#001a1d] via-[#003b40] to-[#005a61] py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_48px_-20px_rgba(0,0,0,0.55)] sm:py-6">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden bg-[radial-gradient(65%_120%_at_100%_50%,rgba(0,140,150,0.12),transparent_62%)]"
        />
        <div className="container-luxe relative z-[1]">
          <Reveal>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
              <div className="flex min-w-0 flex-col gap-2 lg:flex-row lg:items-center lg:gap-5 xl:gap-6">
                <h2
                  id="final-cta-heading"
                  className="shrink-0 font-display text-lg font-bold leading-snug tracking-[-0.02em] text-white sm:text-xl lg:whitespace-nowrap"
                >
                  {title}
                </h2>
                <p className="min-w-0 text-pretty text-sm leading-relaxed text-white/72 lg:max-w-[34ch] lg:border-s lg:border-white/12 lg:ps-5 xl:ps-6">
                  {site.finalCta.body}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <TrackedLinkButton
                  href={site.finalCta.cta.href}
                  event="homepage_cta_click"
                  eventProps={{ cta: "final_primary", location: "final_cta" }}
                  variant="vip"
                  size="md"
                  withArrow
                  className="w-full sm:w-auto sm:whitespace-nowrap"
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
                  className="w-full sm:w-auto sm:whitespace-nowrap"
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
