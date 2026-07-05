"use client";

import Image from "next/image";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, useState } from "react";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";

const photoClass = "manifesto-photo overflow-hidden rounded-card-lg";
const LINES = site.manifesto;
const manifestoLineClass =
  "text-[clamp(1.3125rem,1.55vw+0.95rem,1.9375rem)] leading-[1.42]";

function ManifestoStatic() {
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
                <ManifestoPhotoStackStatic />
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ManifestoPhotoStackStatic() {
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

function ManifestoPhotoStackAnimated({
  photo1Y,
  photo2Y,
  photo3Y,
  photo1Rotate,
  photo2Rotate,
  photo3Scale,
}: {
  photo1Y: MotionValue<number>;
  photo2Y: MotionValue<number>;
  photo3Y: MotionValue<number>;
  photo1Rotate: MotionValue<number>;
  photo2Rotate: MotionValue<number>;
  photo3Scale: MotionValue<number>;
}) {
  return (
    <div className="manifesto-photo-stack relative mx-auto w-full max-w-md lg:max-w-none lg:ms-auto">
      <div
        aria-hidden
        className="manifesto-dot-grid pointer-events-none absolute inset-[-6%] -z-[1]"
      />

      <motion.div
        className="relative z-[2] w-[58%] max-w-[14rem] sm:max-w-[15rem] lg:max-w-none"
        style={{ y: photo1Y, rotate: photo1Rotate, transformOrigin: "center center" }}
      >
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
      </motion.div>

      <motion.div
        className="absolute end-0 top-[14%] z-[3] w-[46%] max-w-[11rem] sm:max-w-[12rem] lg:max-w-none"
        style={{ y: photo2Y, rotate: photo2Rotate, transformOrigin: "center center" }}
      >
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
      </motion.div>

      <motion.div
        className="relative z-[4] mt-[-2.5rem] ms-[8%] w-[88%] sm:mt-[-3rem] lg:mt-[-3.5rem]"
        style={{ y: photo3Y, scale: photo3Scale, rotate: 1, transformOrigin: "center center" }}
      >
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
      </motion.div>
    </div>
  );
}

function ScrollLine({
  line,
  index,
  progress,
  isLast,
}: {
  line: string;
  index: number;
  progress: MotionValue<number>;
  isLast: boolean;
}) {
  const start = index === 0 ? 0.08 : index === 1 ? 0.34 : 0.6;
  const peak = start + 0.14;
  const settle = start + 0.22;

  const opacity = useTransform(
    progress,
    index === 0
      ? [0, start, peak, 0.48, 0.62]
      : index === 1
        ? [0, start - 0.06, start, peak, 0.78, 0.88]
        : [0, start - 0.08, start, peak, 1],
    index === 0
      ? [0.18, 0.18, 1, 0.72, 0.42]
      : index === 1
        ? [0.15, 0.15, 0.22, 1, 0.78, 0.48]
        : [0.15, 0.15, 0.22, 1, 1],
  );

  const y = useTransform(
    progress,
    [start - 0.04, peak],
    [22, 0],
  );

  const emphasis = useTransform(progress, [settle, settle + 0.12], [0, 1]);

  return (
    <motion.p
      style={{ opacity, y }}
      className={cn(
        "relative font-display text-balance",
        manifestoLineClass,
        isLast ? "manifesto-text font-medium" : "manifesto-text-dim font-normal",
      )}
    >
      {line}
      {isLast ? (
        <motion.span
          aria-hidden
          className="manifesto-line-accent absolute -bottom-1 start-0 h-[2px] w-full max-w-[12rem] rounded-full bg-gradient-to-l from-emerald via-gold/80 to-gold"
          style={{ scaleX: emphasis, transformOrigin: "right center" }}
        />
      ) : null}
    </motion.p>
  );
}

function StepPip({ fill }: { fill: MotionValue<number> }) {
  const scale = useTransform(fill, [0, 1], [1, 1.35]);
  const pipOpacity = useTransform(fill, [0, 1], [0.28, 1]);

  return (
    <motion.span
      aria-hidden
      className="manifesto-step-pip inline-block h-1.5 w-1.5 rounded-full bg-gold"
      style={{ scale, opacity: pipOpacity }}
    />
  );
}

function ActiveStepCounter({ progress }: { progress: MotionValue<number> }) {
  const [step, setStep] = useState(1);

  useMotionValueEvent(progress, "change", (value) => {
    setStep(value + 1);
  });

  return (
    <>
      {toPersianDigits(String(step))}
      <span aria-hidden className="mx-1 text-bone/20">
        /
      </span>
      {toPersianDigits(String(LINES.length))}
    </>
  );
}

function ManifestoScrollDriven() {
  const containerRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const photo1Y = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const photo2Y = useTransform(scrollYProgress, [0, 1], [0, -88]);
  const photo3Y = useTransform(scrollYProgress, [0, 1], [0, -32]);
  const photo1Rotate = useTransform(scrollYProgress, [0, 0.5, 1], [-2, -4, -1]);
  const photo2Rotate = useTransform(scrollYProgress, [0, 0.5, 1], [5, 9, 4]);
  const photo3Scale = useTransform(scrollYProgress, [0.55, 1], [1, 1.05]);

  const glowOpacity = useTransform(scrollYProgress, [0, 0.45, 0.75, 1], [0.35, 0.65, 0.55, 0.45]);
  const glowY = useTransform(scrollYProgress, [0, 1], ["20%", "-10%"]);

  const quoteOpacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);
  const quoteY = useTransform(scrollYProgress, [0, 0.12], [16, 0]);

  const signatureOpacity = useTransform(scrollYProgress, [0.78, 0.92], [0, 1]);
  const signatureY = useTransform(scrollYProgress, [0.78, 0.92], [12, 0]);

  const step1Active = useTransform(scrollYProgress, [0.08, 0.34], [1, 0]);
  const step2Active = useTransform(scrollYProgress, [0.28, 0.34, 0.6, 0.66], [0, 1, 1, 0]);
  const step3Active = useTransform(scrollYProgress, [0.58, 0.64], [0, 1]);

  const activeStep = useTransform(scrollYProgress, (v): number => {
    if (v < 0.34) return 0;
    if (v < 0.64) return 1;
    return 2;
  });

  const counterOpacity = useTransform(scrollYProgress, [0.04, 0.1], [0, 1]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [1, 0.6, 0.6, 0]);

  return (
    <section
      ref={containerRef}
      aria-label={site.manifestoEyebrow}
      className="manifesto-section manifesto-scroll-track relative isolate"
    >
      <div className="manifesto-sticky-stage sticky top-14 flex min-h-[calc(100dvh-3.5rem)] items-center md:top-16 md:min-h-[calc(100dvh-4rem)]">
        <div className="container-luxe w-full py-6 md:py-8">
          <div className="manifesto-panel relative overflow-hidden rounded-card-lg">
            <motion.div
              aria-hidden
              className="manifesto-ambient-glow pointer-events-none absolute inset-0"
              style={{ opacity: glowOpacity, y: glowY }}
            />

            <div className="relative grid items-center gap-8 p-5 sm:p-6 md:gap-10 md:p-8 lg:grid-cols-12 lg:gap-12 lg:p-10 xl:gap-14 xl:p-12">
              <div className="flex flex-col justify-center lg:order-2 lg:col-span-7">
                <div className="flex items-center justify-between gap-4">
                  <Eyebrow>{site.manifestoEyebrow}</Eyebrow>
                  <motion.span
                    aria-live="polite"
                    className="manifesto-step-counter num-latin shrink-0 text-caption tracking-[0.2em] text-mist"
                    style={{ opacity: counterOpacity }}
                  >
                    <ActiveStepCounter progress={activeStep} />
                  </motion.span>
                </div>

                <motion.span
                  aria-hidden
                  className="manifesto-quote-mark mt-4 block font-display leading-none select-none md:mt-5"
                  style={{ opacity: quoteOpacity, y: quoteY }}
                >
                  &ldquo;
                </motion.span>

                <div className="relative mt-4 flex gap-4 md:mt-5 md:gap-5">
                  <div
                    aria-hidden
                    className="manifesto-progress-rail relative mt-1 hidden w-[2px] shrink-0 sm:block"
                  >
                    <motion.span
                      className="manifesto-progress-fill absolute inset-x-0 top-0 h-full w-full origin-top rounded-full"
                      style={{ scaleY: scrollYProgress }}
                    />
                  </div>

                  <div className="min-w-0 flex-1 space-y-3.5 md:space-y-4">
                    {LINES.map((line, i) => (
                      <ScrollLine
                        key={line}
                        line={line}
                        index={i}
                        progress={scrollYProgress}
                        isLast={i === LINES.length - 1}
                      />
                    ))}
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-2 md:mt-6">
                  <StepPip fill={step1Active} />
                  <StepPip fill={step2Active} />
                  <StepPip fill={step3Active} />
                  <span className="sr-only">پیشرفت خواندن manifesto</span>
                </div>

                <motion.div
                  className="manifesto-signature mt-6 md:mt-8"
                  style={{ opacity: signatureOpacity, y: signatureY }}
                >
                  <Image
                    src="/media/signature.png"
                    alt="امضای بهرام رستمی"
                    width={168}
                    height={58}
                    className="h-auto w-[min(6.5rem,32vw)] object-contain object-start opacity-70 md:w-[min(7.5rem,28vw)] md:opacity-75"
                  />
                </motion.div>
              </div>

              <div className="lg:order-1 lg:col-span-5">
                <ManifestoPhotoStackAnimated
                  photo1Y={photo1Y}
                  photo2Y={photo2Y}
                  photo3Y={photo3Y}
                  photo1Rotate={photo1Rotate}
                  photo2Rotate={photo2Rotate}
                  photo3Scale={photo3Scale}
                />
              </div>
            </div>
          </div>

          <motion.p
            aria-hidden
            className="manifesto-scroll-hint mt-4 text-center text-caption text-mist/70"
            style={{ opacity: scrollHintOpacity }}
          >
            اسکرول کنید
          </motion.p>
        </div>
      </div>
    </section>
  );
}

export function ManifestoShift() {
  const reduce = useReducedMotion();

  if (reduce) return <ManifestoStatic />;

  return <ManifestoScrollDriven />;
}
