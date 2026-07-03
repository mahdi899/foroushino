"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { Quote } from "lucide-react";
import { useRef } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { sitePhotos } from "@/lib/site-photo-paths";

export function ManifestoShift() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y1 = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 72, reduce ? 0 : -72]);
  const y2 = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 48, reduce ? 0 : -48]);
  const y3 = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 32, reduce ? 0 : -32]);
  const hoverEase = [0.22, 1, 0.36, 1] as const;
  const photoHover = reduce ? undefined : { scale: 1.04, y: -8, transition: { duration: 0.45, ease: hoverEase } };

  return (
    <section
      ref={ref}
      aria-label={site.manifestoEyebrow}
      className="manifesto-section relative isolate overflow-hidden border-t border-[#0b1f22]/8 py-section-sm md:py-section"
    >
      <div className="container-luxe relative">
        <div className="grid items-center gap-10 md:gap-14 lg:grid-cols-12 lg:gap-16 xl:gap-20">
          <div className="lg:col-span-7">
            <div className="manifesto-editorial relative overflow-hidden rounded-card-lg p-6 md:p-10 lg:p-12">
              <span aria-hidden className="manifesto-accent-bar pointer-events-none absolute" />
              <Quote
                className="pointer-events-none absolute start-4 top-4 h-10 w-10 text-gold/15 md:start-6 md:top-6 md:h-14 md:w-14"
                strokeWidth={1.2}
                aria-hidden
              />

              <Reveal>
                <Eyebrow className="relative z-[1]">{site.manifestoEyebrow}</Eyebrow>
              </Reveal>

              <div className="relative z-[1] mt-8 space-y-6 md:mt-10 md:space-y-8 lg:space-y-9">
                {site.manifesto.map((line, i) => (
                  <Reveal key={line} delay={i * 0.1} y={24}>
                    <div className="flex items-start gap-4 md:gap-5">
                      <span
                        aria-hidden
                        className="manifesto-line-index num-latin mt-1 shrink-0 tabular-nums"
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <p
                        className={cn(
                          "min-w-0 font-display text-h3 text-balance leading-[1.28] md:text-h2 md:leading-[1.24]",
                          i === 0 && "manifesto-text-dim",
                          i === 1 && "manifesto-text",
                          i === site.manifesto.length - 1 &&
                            "manifesto-line-accent text-[clamp(1.35rem,2vw+0.9rem,2.25rem)] font-semibold md:text-[clamp(1.5rem,2.2vw+0.95rem,2.5rem)]",
                        )}
                      >
                        {line}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </div>

              <Reveal delay={0.45}>
                <div className="manifesto-signature relative z-[1] mt-8 flex items-center gap-3 border-t border-[#0b1f22]/8 pt-6 md:mt-10 md:gap-4 md:pt-8">
                  <span aria-hidden className="h-px w-10 shrink-0 bg-gradient-to-l from-gold/70 to-transparent md:w-14" />
                  <div>
                    <p className="text-caption uppercase tracking-[0.32em] text-gold">Bahram Rostami</p>
                    <p className="manifesto-text-muted mt-1 text-caption">{site.hero.note}</p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          <div className="lg:col-span-5">
            <Reveal delay={0.15}>
              <div className="manifesto-photo-stack relative mx-auto w-full max-w-md lg:max-w-none">
                <motion.div
                  style={{ y: y1 }}
                  whileHover={photoHover}
                  className="relative z-[2] w-[58%] max-w-[14rem] rotate-[-2deg] sm:max-w-[15rem] lg:max-w-none"
                >
                  <PhotoFrame
                    ratio="portrait"
                    variant="radial"
                    rounded="card-lg"
                    photoCaption="none"
                    showIcon={false}
                    interactive
                    neonTone="gold"
                    src={sitePhotos.manifestoPortraitA}
                    alt="نشست خصوصی"
                  />
                </motion.div>

                <motion.div
                  style={{ y: y2 }}
                  whileHover={photoHover}
                  className="absolute end-0 top-[14%] z-[3] w-[46%] max-w-[11rem] rotate-[5deg] sm:max-w-[12rem] lg:max-w-none"
                >
                  <PhotoFrame
                    ratio="portrait"
                    variant="grid"
                    rounded="card"
                    photoCaption="none"
                    showIcon={false}
                    interactive
                    neonTone="gold"
                    src={sitePhotos.manifestoPortraitB}
                    alt="پشت صحنه"
                  />
                </motion.div>

                <motion.div
                  style={{ y: y3 }}
                  whileHover={photoHover}
                  className="relative z-[4] mt-[-2.5rem] ms-[8%] w-[88%] rotate-[1deg] sm:mt-[-3rem] lg:mt-[-3.5rem]"
                >
                  <PhotoFrame
                    ratio="landscape"
                    variant="soft"
                    rounded="card-lg"
                    photoCaption="none"
                    showIcon={false}
                    interactive
                    neonTone="gold"
                    src={sitePhotos.manifestoLandscape}
                    alt="استودیوی آکادمی"
                  />
                </motion.div>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
