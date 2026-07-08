"use client";

import { SiteImage } from "@/components/ui/SiteImage";
import { ArrowLeft, Briefcase, GraduationCap, Wallet } from "lucide-react";
import { Fragment } from "react";
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
  "sm:grid-cols-3 sm:gap-x-2 sm:gap-y-5 md:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)_2.25rem_minmax(0,1fr)] md:gap-x-0 md:gap-y-0 lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]";

const iconRowClass =
  "flex h-12 w-12 shrink-0 items-center justify-center sm:mx-auto sm:h-14 sm:w-full md:h-16 lg:h-[4.5rem] lg:w-full";

function StepIcon({ index }: { index: number }) {
  const Icon = stepIcons[index] ?? GraduationCap;

  return (
    <span className="campaign-journey-step-icon inline-flex h-12 w-12 items-center justify-center rounded-2xl sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-[4.5rem] lg:w-[4.5rem]">
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" strokeWidth={1.55} aria-hidden />
    </span>
  );
}

function CampaignJourneyStep({
  index,
  step,
}: {
  index: number;
  step: (typeof site.campaignJourney.steps)[number];
}) {
  return (
    <article
      data-step={index}
      className="campaign-journey-step campaign-journey-step--lit campaign-journey-step--active flex min-w-0 flex-row items-center gap-3.5 border-b border-bone/10 pb-4 text-start last:border-b-0 last:pb-0 sm:flex-col sm:items-center sm:gap-0 sm:border-b-0 sm:px-1.5 sm:pb-0 sm:text-center md:px-2 lg:px-3"
    >
      <div className={iconRowClass}>
        <StepIcon index={index} />
      </div>
      <div className="min-w-0 flex-1 sm:w-full sm:flex-none">
        <p className="campaign-journey-step-tag font-display text-base font-semibold leading-snug text-bone sm:mt-4 sm:text-lg md:text-xl lg:mt-4 lg:text-[1.375rem] xl:text-2xl">
          {stepTags[index]}
        </p>
        <h3 className="mt-1 text-sm leading-relaxed text-bone-dim sm:mt-2.5 sm:max-w-[13rem] sm:mx-auto md:max-w-[11rem] lg:max-w-[14rem] lg:text-[0.9375rem]">
          {step.title}
        </h3>
      </div>
    </article>
  );
}

function CampaignJourneyConnector() {
  return (
    <div
      aria-hidden
      className={cn(
        "campaign-journey-step-connector campaign-journey-step-connector--lit hidden min-w-0 md:flex",
        iconRowClass,
      )}
    >
      <span className="campaign-journey-step-connector-pill inline-flex h-9 w-9 items-center justify-center rounded-full">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.65} />
      </span>
    </div>
  );
}

function CampaignJourneyPhoto() {
  return (
    <figure className="campaign-journey-photo relative mx-3 aspect-[16/10] max-h-[min(68vw,16.5rem)] w-[calc(100%-1.5rem)] overflow-hidden rounded-card sm:mx-4 sm:max-h-[min(72vw,18rem)] sm:w-[calc(100%-2rem)] md:mx-5 md:aspect-[5/4] md:max-h-[min(80vw,22rem)] lg:col-span-6 lg:m-0 lg:aspect-auto lg:max-h-none lg:min-h-full lg:w-auto lg:self-stretch lg:rounded-e-none lg:rounded-s-card-lg">
      <SiteImage
        src={stepPhotos[0]!}
        alt={stepPhotoAlts[0]!}
        fill
        className="object-cover object-center"
        sizes="(max-width: 1023px) 100vw, 50vw"
      />
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

function CampaignJourneyStage() {
  const { campaignJourney } = site;
  const steps = campaignJourney.steps;

  return (
    <div className="campaign-journey-stage group/stage overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/30 shadow-[0_28px_56px_-36px_rgba(0,0,0,0.75)]">
      <div className="grid lg:min-h-[30rem] lg:grid-cols-12 lg:items-stretch xl:min-h-[32rem]">
        <CampaignJourneyPhoto />

        <div className="flex min-h-0 flex-col justify-center px-3 py-4 sm:px-5 sm:py-5 md:px-5 md:py-6 lg:col-span-6 lg:min-h-full lg:px-6 lg:py-7 lg:ps-5 xl:px-8 xl:py-8">
          <div
            className={cn(
              "campaign-journey-steps grid w-full grid-cols-1 gap-y-0 sm:grid sm:items-start",
              stepsGridClass,
            )}
          >
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <CampaignJourneyStep index={i} step={step} />
                {i < steps.length - 1 ? <CampaignJourneyConnector /> : null}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="campaign-journey-footer col-span-full flex justify-center px-3 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-7 md:px-5 md:pb-6 md:pt-8 lg:px-6 lg:pb-7 lg:pt-10 xl:px-8">
          <TrackedLinkButton
            href={campaignJourney.cta.href}
            event="homepage_cta_click"
            eventProps={{ cta: "campaign_journey", location: "campaign_journey" }}
            variant="primary"
            withArrow
            size="lg"
            className="h-11 min-h-11 w-full max-w-none px-5 text-sm font-semibold sm:max-w-md sm:text-base md:h-12 md:min-h-12 lg:h-14 lg:min-h-14 lg:text-lg"
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

export function CampaignScrollStory() {
  return (
    <section
      aria-labelledby="campaign-journey-heading"
      className="relative pt-4 pb-8 md:pt-6 md:pb-10 lg:pt-8"
    >
      <div className="container-luxe">
        <Reveal>
          <CampaignJourneyHeader />
        </Reveal>
        <Reveal delay={0.1} y={24}>
          <div className="mt-5 md:mt-6">
            <CampaignJourneyStage />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
