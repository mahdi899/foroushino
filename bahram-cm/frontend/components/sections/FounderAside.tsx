import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { LinkButton } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { sitePhotos } from "@/lib/site-photo-paths";
import { siteStorageMedia } from "@/config/media";

export function FounderAside() {
  return (
    <section className="py-7 md:py-9 lg:py-10" aria-labelledby="founder-aside-heading">
      <div className="container-luxe">
        <div className="grid items-center gap-6 sm:gap-7 lg:grid-cols-12 lg:gap-8 xl:gap-9">
          <Reveal className="lg:col-span-5">
            <div className="relative aspect-[25/24] w-full overflow-hidden rounded-card-lg border border-bone/10 shadow-frame max-lg:rounded-card">
              <SiteImage
                src={sitePhotos.portraitFounder}
                alt={site.founderAside.title}
                fill
                className="object-cover object-[center_18%]"
                sizes="(max-width: 1023px) 100vw, 42vw"
              />
            </div>
          </Reveal>

          <div className="flex min-w-0 flex-col justify-center lg:col-span-7">
            <Reveal>
              <Eyebrow>{site.founderAside.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.06}>
              <h2
                id="founder-aside-heading"
                className="mt-2.5 font-display text-xl font-semibold tracking-[-0.02em] text-bone md:text-2xl"
              >
                {site.founderAside.title}
              </h2>
            </Reveal>
            <Reveal delay={0.12}>
              <blockquote className="founder-aside-quote mt-3 max-w-[34rem] text-pretty font-display text-base font-medium leading-[1.55] text-bone md:mt-3.5 md:text-lg">
                «آموزش نمایشی نمی‌خواهم؛ مسیر ساختاری می‌خواهم.»
              </blockquote>
            </Reveal>
            <Reveal delay={0.18}>
              <p className="mt-3 max-w-xl text-sm leading-[1.75] text-bone-dim md:mt-3.5 md:text-body">
                <span className="lg:hidden">{site.founderAside.bodyMobile}</span>
                <span className="hidden lg:inline">{site.founderAside.body}</span>
              </p>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-bone/8 pt-4 sm:gap-4 md:mt-5">
                <SiteImage
                  src={siteStorageMedia('signature.png')}
                  alt="امضای بهرام"
                  fallbackAlt="امضای بهرام"
                  width={180}
                  height={63}
                  wrapperClassName="leading-none"
                  className="h-auto w-[min(5rem,28vw)] max-w-[96px] shrink-0 object-contain object-start sm:max-w-[120px] md:max-w-[148px] lg:max-w-[168px]"
                />
                <LinkButton
                  href="/founder"
                  variant="ghost"
                  withArrow
                  size="md"
                  className="max-lg:flex-1 max-lg:min-w-0 sm:max-lg:flex-none"
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
