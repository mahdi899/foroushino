"use client";

import Image from "next/image";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";

const photoClass = "manifesto-photo overflow-hidden rounded-card-lg";
const LINES = site.manifesto;
const manifestoLineClass =
  "text-[clamp(1.3125rem,1.55vw+0.95rem,1.9375rem)] leading-[1.42]";

function ManifestoPhotoStack() {
  return (
    <div className="manifesto-photo-stack relative mx-auto w-full max-w-md lg:max-w-none lg:ms-auto">
      <div
        aria-hidden
        className="manifesto-dot-grid pointer-events-none absolute inset-[-6%] -z-[1]"
      />

      <div className="relative z-[2] w-[58%] max-w-[14rem] rotate-[-2deg] sm:max-w-[15rem] lg:max-w-none">
        <div className={photoClass}>
          <Image
            src={sitePhotos.manifestoPortraitA}
            alt="نشست خصوصی"
            width={320}
            height={400}
            className="aspect-[4/5] h-auto w-full object-cover"
            sizes="(max-width: 1023px) 200px, 260px"
          />
        </div>
      </div>

      <div className="absolute end-0 top-[14%] z-[3] w-[46%] max-w-[11rem] rotate-[5deg] sm:max-w-[12rem] lg:max-w-none">
        <div className={photoClass}>
          <Image
            src={sitePhotos.manifestoPortraitB}
            alt="پشت صحنه"
            width={260}
            height={325}
            className="aspect-[4/5] h-auto w-full object-cover"
            sizes="(max-width: 1023px) 160px, 210px"
          />
        </div>
      </div>

      <div className="relative z-[4] mt-[-2.5rem] ms-[8%] w-[88%] rotate-[1deg] sm:mt-[-3rem] lg:mt-[-3.5rem]">
        <div className={photoClass}>
          <Image
            src={sitePhotos.manifestoLandscape}
            alt="استودیوی آکادمی"
            width={480}
            height={300}
            className="aspect-[16/10] h-auto w-full object-cover"
            sizes="(max-width: 1023px) 300px, 400px"
          />
        </div>
      </div>
    </div>
  );
}

export function ManifestoShift() {
  return (
    <section
      aria-label={site.manifestoEyebrow}
      className="manifesto-section relative isolate overflow-hidden pt-4 pb-section-sm md:pt-6 md:pb-section lg:pt-8"
    >
      <div className="container-luxe">
        <div className="manifesto-panel overflow-hidden rounded-card-lg">
          <div className="grid items-center gap-10 p-6 md:gap-12 md:p-10 lg:grid-cols-12 lg:gap-14 lg:p-12 xl:gap-16 xl:p-14">
            <div className="flex flex-col justify-center lg:order-2 lg:col-span-7">
              <Reveal>
                <Eyebrow>{site.manifestoEyebrow}</Eyebrow>
              </Reveal>
              <Reveal delay={0.04}>
                <span
                  aria-hidden
                  className="manifesto-quote-mark mt-5 block font-display leading-none select-none md:mt-6"
                >
                  &ldquo;
                </span>
              </Reveal>

              <div className="mt-5 space-y-4 md:mt-7 md:space-y-5">
                {LINES.map((line, i) => (
                  <Reveal key={line} delay={i * 0.07} y={14}>
                    <p
                      className={cn(
                        "font-display text-balance",
                        manifestoLineClass,
                        i === LINES.length - 1
                          ? "manifesto-text font-medium"
                          : "manifesto-text-dim font-normal",
                      )}
                    >
                      {line}
                    </p>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={0.3}>
                <div className="manifesto-signature mt-8 md:mt-10">
                  <Image
                    src="/media/signature.png"
                    alt="امضای بهرام رستمی"
                    width={168}
                    height={58}
                    className="h-auto w-[min(6.5rem,32vw)] object-contain object-start opacity-70 md:w-[min(7.5rem,28vw)] md:opacity-75"
                  />
                </div>
              </Reveal>
            </div>

            <div className="lg:order-1 lg:col-span-5">
              <Reveal delay={0.1}>
                <ManifestoPhotoStack />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
