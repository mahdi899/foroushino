"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { site } from "@/content/site";
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
  const y1 = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 60, reduce ? 0 : -60]);
  const y2 = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 40, reduce ? 0 : -40]);

  return (
    <section ref={ref} className="relative isolate overflow-hidden py-section-sm md:py-section">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_15%_30%,rgba(14,59,44,0.25),transparent_70%)]"
      />
      <div className="container-luxe relative">
        <div className="grid items-center gap-8 md:gap-14 lg:grid-cols-12 lg:gap-20">
          <div className="lg:col-span-7">
            <div className="flex flex-row items-start gap-3 md:flex-col md:gap-0">
              <Reveal>
                <Eyebrow className="mt-0.5 shrink-0 md:mt-0">مانیفست</Eyebrow>
              </Reveal>
              <div className="min-w-0 flex-1 space-y-1.5 md:mt-10 md:space-y-3">
                {site.manifesto.map((line, i) => (
                  <Reveal key={line} delay={i * 0.08} y={22}>
                    <p className="font-display text-h2 text-balance leading-[1.2] text-bone md:leading-[1.25]">
                      {i === site.manifesto.length - 1 ? (
                        <span className="bg-gradient-to-l from-emerald-glow via-bone to-gold bg-clip-text text-transparent">
                          {line}
                        </span>
                      ) : (
                        line
                      )}
                    </p>
                  </Reveal>
                ))}
              </div>
            </div>
            <Reveal delay={0.45}>
              <div className="mt-6 hidden items-center gap-3 md:mt-10 md:flex md:gap-4">
                <span aria-hidden className="h-px w-12 shrink-0 bg-gold/50 md:w-16" />
                <span className="text-caption uppercase tracking-[0.3em] text-gold">
                  Bahram Rostami
                </span>
              </div>
            </Reveal>
          </div>

          <div className="lg:col-span-5">
            <div className="relative mx-auto grid w-full max-w-md grid-cols-12 gap-2 sm:gap-3">
              <motion.div style={{ y: y1 }} className="col-span-7">
                <PhotoFrame
                  ratio="portrait"
                  variant="radial"
                  rounded="card"
                  label="نشست خصوصی"
                  showIcon={false}
                  src={sitePhotos.manifestoPortraitA}
                  alt="نشست خصوصی"
                />
              </motion.div>
              <motion.div style={{ y: y2 }} className="col-span-5 self-end">
                <PhotoFrame
                  ratio="portrait"
                  variant="grid"
                  rounded="card"
                  label="پشت صحنه"
                  showIcon={false}
                  src={sitePhotos.manifestoPortraitB}
                  alt="پشت صحنه"
                />
              </motion.div>
              <motion.div style={{ y: y2 }} className="col-span-12">
                <PhotoFrame
                  ratio="landscape"
                  variant="soft"
                  rounded="card"
                  label="استودیوی آکادمی"
                  showIcon={false}
                  src={sitePhotos.manifestoLandscape}
                  alt="استودیوی آکادمی"
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
