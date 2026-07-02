import Image from "next/image";
import { Quote } from "lucide-react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LinkButton } from "@/components/ui/Button";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export function FounderAside() {
  return (
    <section className="py-9 md:py-section">
      <div className="container-luxe">
        <div className="grid items-stretch gap-5 lg:grid-cols-12 lg:gap-14">
          {/* Portrait + secondary frames */}
          <Reveal className="lg:col-span-5">
            <div className="relative max-lg:mx-auto max-lg:w-full max-lg:max-w-[12.75rem] sm:max-lg:max-w-[13.25rem]">
              <div
                aria-hidden
                className="absolute -inset-4 -z-[1] rounded-card-lg bg-emerald-deep/30 blur-3xl lg:-inset-6"
              />
              <PhotoFrame
                ratio="portrait"
                variant="radial"
                rounded="card-lg"
                badge="پرتره — Founder"
                label="بهرام رستمی"
                className="shadow-frame max-lg:!rounded-card"
                sizes="(max-width: 1023px) 220px, 420px"
                src={sitePhotos.portraitFounder}
                alt="بهرام رستمی"
              />
              {/* Secondary square */}
              <div className="absolute -end-6 -bottom-6 hidden w-40 md:block">
                <PhotoFrame
                  ratio="square"
                  variant="grid"
                  rounded="card"
                  label="بک‌استیج"
                  showIcon={false}
                  className="rotate-[3deg]"
                  src={sitePhotos.squareBackstage}
                  alt="بک‌استیج"
                />
              </div>
            </div>
          </Reveal>

          <div className="min-w-0 lg:col-span-7">
            <Reveal>
              <Eyebrow>{site.founderAside.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <Quote className="mt-4 hidden h-9 w-9 text-gold/50 lg:mt-7 lg:block" strokeWidth={1.3} aria-hidden />
            </Reveal>
            <Reveal delay={0.14}>
              <h2 className="mt-3 max-w-3xl text-balance font-display text-lg font-semibold leading-snug text-bone md:text-xl lg:mt-4 lg:text-h2 lg:font-normal lg:leading-tight">
                «آموزش نمایشی نمی‌خواهم؛ مسیر ساختاری می‌خواهم.»
              </h2>
            </Reveal>
            <Reveal delay={0.2}>
              <p className="mt-4 max-w-2xl text-[0.9rem] leading-[1.65] text-bone-dim md:mt-5 md:text-base lg:mt-7 lg:text-lg">
                <span className="lg:hidden">{site.founderAside.bodyMobile}</span>
                <span className="hidden lg:inline">{site.founderAside.body}</span>
              </p>
            </Reveal>
            <Reveal delay={0.26}>
              <div className="mt-5 flex w-full flex-row flex-nowrap items-center justify-start gap-2 border-t border-bone/8 pt-4 sm:gap-3 sm:pt-6 lg:mt-9 lg:gap-6 lg:pt-8">
                <Image
                  src="/media/signature.png"
                  alt="امضای بهرام"
                  width={200}
                  height={70}
                  className="h-auto w-[min(5.75rem,30vw)] max-w-[115px] shrink-0 object-contain object-start sm:max-w-[140px] sm:w-[min(9rem,38vw)] md:max-w-[180px] lg:w-[200px] lg:max-w-none"
                />
                <LinkButton
                  href="/founder"
                  variant="ghost"
                  withArrow
                  size="lg"
                  className="max-lg:h-11 max-lg:min-h-11 max-lg:min-w-0 max-lg:flex-1 max-lg:px-5 max-lg:text-[0.88rem] w-auto lg:flex-none lg:max-w-none"
                >
                  درباره‌ی بهرام
                </LinkButton>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
