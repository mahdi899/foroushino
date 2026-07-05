"use client";

import Image from "next/image";
import { ArrowLeft, Briefcase, GraduationCap, Wallet } from "lucide-react";
import { Fragment, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";

const stepIcons = [GraduationCap, Wallet, Briefcase] as const;
const stepTags = ["آموزش", "درآمد ماهانه", "پروژه"] as const;

const stepPhotos = [
  sitePhotos.courseBackstage,
  sitePhotos.storyStep[1]!,
  sitePhotos.storyStep[2]!,
] as const;

const stepPhotoAlts = [
  "آموزش کمپین‌نویسی",
  "مسیر درآمد حرفه‌ای",
  "پروژه‌های واقعی",
] as const;

const stepsGridClass =
  "sm:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)_2.75rem_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]";

const iconRowClass =
  "flex h-14 w-full shrink-0 items-center justify-center sm:h-16 lg:h-[4.5rem]";

function scrollStepIndex(progress: number): number {
  if (progress < 0.3) return 0;
  if (progress < 0.62) return 1;
  return 2;
}

function StepIcon({ index }: { index: number }) {
  const Icon = stepIcons[index] ?? GraduationCap;

  return (
    <span className="campaign-journey-step-icon inline-flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]">
      <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.55} aria-hidden />
    </span>
  );
}

function CampaignJourneyStep({
  index,
  step,
  isLit,
  isActive,
}: {
  index: number;
  step: (typeof site.campaignJourney.steps)[number];
  isLit: boolean;
  isActive: boolean;
}) {
  return (
    <motion.article
      data-step={index}
      className={cn(
        "campaign-journey-step flex min-w-0 flex-col items-center px-1 text-center sm:px-2 lg:px-3",
        isLit && "campaign-journey-step--lit",
        isActive && "campaign-journey-step--active",
      )}
      animate={{ opacity: isLit ? 1 : 0.42, y: isLit ? 0 : 6 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={iconRowClass}>
        <StepIcon index={index} />
      </div>
      <p className="campaign-journey-step-tag mt-4 w-full font-display text-xl font-semibold leading-tight text-bone lg:text-[1.375rem] xl:text-2xl">
        {stepTags[index]}
      </p>
      <h3 className="mt-2.5 w-full max-w-[13rem] text-sm leading-relaxed text-bone-dim lg:max-w-[14rem] lg:text-[0.9375rem]">
        {step.title}
      </h3>
    </motion.article>
  );
}

function CampaignJourneyConnector({ isLit }: { isLit: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        "campaign-journey-step-connector hidden min-w-0 sm:flex",
        iconRowClass,
        isLit && "campaign-journey-step-connector--lit",
      )}
    >
      <span className="campaign-journey-step-connector-pill inline-flex h-9 w-9 items-center justify-center rounded-full">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.65} />
      </span>
    </div>
  );
}

function CampaignJourneyPhoto({
  activeStep,
  photoScale,
}: {
  activeStep: number;
  photoScale?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const photoIndex = Math.min(Math.max(activeStep, 0), stepPhotos.length - 1);

  return (
    <figure className="campaign-journey-photo relative m-4 aspect-[5/4] min-h-[14rem] overflow-hidden rounded-card-lg sm:m-5 sm:min-h-[16rem] lg:col-span-6 lg:m-0 lg:aspect-auto lg:min-h-full lg:self-stretch lg:rounded-e-none lg:rounded-s-card-lg">
      <motion.div
        className="absolute inset-0"
        style={photoScale && !reduce ? { scale: photoScale } : undefined}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={photoIndex}
            className="absolute inset-0"
            initial={reduce ? false : { opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image
              src={stepPhotos[photoIndex]!}
              alt={stepPhotoAlts[photoIndex]!}
              fill
              className="object-cover object-center"
              sizes="(max-width: 1023px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>
      <span
        aria-hidden
        className="campaign-journey-photo-accent pointer-events-none absolute inset-y-4 start-0 z-[2] w-1.5 rounded-full lg:inset-y-0 lg:end-0 lg:start-auto lg:w-2"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[2] bg-gradient-to-t from-black/35 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-black/20"
      />
    </figure>
  );
}

function CampaignJourneyStage({
  activeStep,
  photoScale,
}: {
  activeStep: number;
  photoScale?: MotionValue<number>;
}) {
  const { campaignJourney } = site;
  const steps = campaignJourney.steps;
  const reduce = useReducedMotion();
  const resolvedStep = reduce ? steps.length - 1 : activeStep;

  return (
    <div className="campaign-journey-stage group/stage">
      <div className="grid lg:min-h-[30rem] lg:grid-cols-12 lg:items-stretch xl:min-h-[32rem]">
        <CampaignJourneyPhoto activeStep={resolvedStep} photoScale={photoScale} />

        <div className="flex min-h-0 flex-col justify-center px-4 py-5 sm:px-5 sm:py-6 lg:col-span-6 lg:min-h-full lg:px-6 lg:py-7 lg:ps-5 xl:px-8 xl:py-8">
          <div
            className={cn(
              "campaign-journey-steps grid w-full grid-cols-1 gap-y-10 sm:grid sm:items-start sm:gap-y-0",
              stepsGridClass,
            )}
            aria-live="polite"
          >
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <CampaignJourneyStep
                  index={i}
                  step={step}
                  isLit={resolvedStep >= i}
                  isActive={resolvedStep === i}
                />
                {i < steps.length - 1 ? (
                  <CampaignJourneyConnector isLit={resolvedStep > i} />
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="campaign-journey-footer col-span-full flex justify-center px-4 pb-5 pt-8 sm:px-5 sm:pb-6 sm:pt-10 lg:px-6 lg:pb-7 lg:pt-12 xl:px-8">
          <TrackedLinkButton
            href={campaignJourney.cta.href}
            event="homepage_cta_click"
            eventProps={{ cta: "campaign_journey", location: "campaign_journey" }}
            variant="primary"
            withArrow
            size="lg"
            className="h-[4.25rem] min-h-[4.25rem] w-full max-w-md px-10 text-xl font-semibold sm:w-auto sm:min-w-[22rem]"
          >
            {campaignJourney.cta.label}
          </TrackedLinkButton>
        </div>
      </div>
    </div>
  );
}

function CampaignJourneyHeader() {
  const { campaignJourney } = site;

  return (
    <div className="flex min-w-0 max-w-2xl items-start gap-2.5 text-start md:max-w-3xl">
      <span
        aria-hidden
        className="mt-[0.6em] inline-block h-[5px] w-[5px] shrink-0 rounded-full bg-gold"
      />
      <div className="min-w-0 flex-1">
        <Eyebrow withDot={false}>{campaignJourney.eyebrow}</Eyebrow>
        <h2
          id="campaign-journey-heading"
          className="mt-2 text-balance font-display text-h3 text-bone md:mt-2.5 md:text-h2"
        >
          {campaignJourney.title}
        </h2>
      </div>
    </div>
  );
}

function CampaignJourneyScrollStage() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start start", "end end"],
  });

  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.1, 0.88, 1], [1, 0.55, 0.55, 0]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActiveStep(scrollStepIndex(value));
  });

  return (
    <div ref={scrollRef} className="campaign-journey-scroll-track relative">
      <div className="campaign-journey-sticky-stage sticky top-14 md:top-16">
        <div className="container-luxe py-4 md:py-5">
          <CampaignJourneyHeader />
          <div className="mt-4 md:mt-5">
            <CampaignJourneyStage activeStep={activeStep} photoScale={photoScale} />
          </div>
          <motion.p
            aria-hidden
            className="campaign-journey-scroll-hint mt-3 text-center text-caption text-mist/70"
            style={{ opacity: scrollHintOpacity }}
          >
            اسکرول کنید — مراحل یکی‌یکی روشن می‌شوند
          </motion.p>
        </div>
      </div>
    </div>
  );
}

export function CampaignScrollStory() {
  const reduce = useReducedMotion();

  return (
    <section
      aria-labelledby="campaign-journey-heading"
      className="relative pt-4 pb-8 md:pt-6 md:pb-10 lg:pt-8"
    >
      {reduce ? (
        <Reveal delay={0.1}>
          <div className="container-luxe">
            <CampaignJourneyHeader />
            <div className="mt-5 md:mt-6">
              <CampaignJourneyStage activeStep={site.campaignJourney.steps.length - 1} />
            </div>
          </div>
        </Reveal>
      ) : (
        <CampaignJourneyScrollStage />
      )}
    </section>
  );
}
