import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { NewsletterJoinButton } from "@/components/sections/NewsletterJoinButton";

export function NewsletterCTA() {
  return (
    <section className="newsletter-cta-band" aria-labelledby="newsletter-cta-heading">
        <div className="newsletter-cta-band__surface relative overflow-hidden py-10 sm:py-12 md:py-14 lg:py-16">
        <div
          aria-hidden
          className="newsletter-cta-band__ambient pointer-events-none absolute inset-0"
        />

        <div className="container-luxe relative z-[1] min-w-0">
          <div className="newsletter-cta-band__layout">
            <Reveal className="newsletter-cta-band__copy">
              <Eyebrow className="newsletter-cta-band__eyebrow justify-center md:justify-start">
                یادداشت‌های هفتگی
              </Eyebrow>
              <h2
                id="newsletter-cta-heading"
                className="newsletter-cta-band__title mt-3 text-balance font-display text-xl font-bold md:mt-4 md:text-h2"
              >
                هر هفته، یک نگاه تازه.
              </h2>
              <p className="newsletter-cta-band__lead mx-auto mt-3 max-w-md text-sm leading-relaxed md:mx-0 md:text-body">
                کمپین و رشد حرفه‌ای — با شماره موبایل عضو شو، بدون اسپم.
              </p>
            </Reveal>

            <Reveal delay={0.08} className="newsletter-cta-band__form-wrap w-full min-w-0">
              <NewsletterJoinButton />
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
