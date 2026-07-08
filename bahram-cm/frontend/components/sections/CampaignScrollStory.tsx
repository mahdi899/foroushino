"use client";

import { SiteImage } from "@/components/ui/SiteImage";
import { ArrowLeft, Briefcase, GraduationCap, Wallet } from "lucide-react";
import { Fragment } from "react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";
import "@/styles/campaign-journey.css";

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

const iconRowClass =
  "campaign-journey-step__icon-wrap flex h-12 w-12 shrink-0 items-center justify-center sm:mx-auto sm:h-14 sm:w-full md:h-16 lg:h-[4.5rem] lg:w-full";

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
}: {
  index: number;
}) {
  return (
    <article
      data-step={index}
      className="campaign-journey-step campaign-journey-step--lit campaign-journey-step--active min-w-0"
    >
      <div className={iconRowClass}>
        <StepIcon index={index} />
      </div>
      <div className="campaign-journey-step__copy min-w-0">
        <p className="campaign-journey-step-tag font-display font-semibold leading-snug text-bone">
          {stepTags[index]}
        </p>
      </div>
    </article>
  );
}

function CampaignJourneyConnector() {
  return (
    <div
      aria-hidden
      className="campaign-journey-step-connector campaign-journey-step-connector--lit hidden min-w-0 md:flex"
    >
      <span className="campaign-journey-step-connector-pill inline-flex h-9 w-9 items-center justify-center rounded-full">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.65} />
      </span>
    </div>
  );
}

function CampaignJourneyPhoto() {
  return (
    <figure className="campaign-journey-photo relative shrink-0 overflow-hidden rounded-card lg:rounded-e-none lg:rounded-s-card-lg">
      <SiteImage
        src={stepPhotos[0]!}
        alt={stepPhotoAlts[0]!}
        fill
        className="campaign-journey-photo__img object-cover object-center"
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
      <div className="campaign-journey-stage__grid">
        <CampaignJourneyPhoto />

        <div className="flex min-h-0 flex-col justify-center px-3 py-4 sm:px-5 sm:py-5 md:px-5 md:py-6 lg:col-span-6 lg:min-h-full lg:px-6 lg:py-7 lg:ps-5 xl:px-8 xl:py-8">
          <div className="campaign-journey-steps grid grid-cols-1 gap-y-0">
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <CampaignJourneyStep index={i} />
                {i < steps.length - 1 ? <CampaignJourneyConnector /> : null}
              </Fragment>
            ))}
          </div>
        </div>

        <div className="campaign-journey-footer flex justify-center border-t border-bone/10 px-3 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-7 md:px-5 md:pb-6 md:pt-8 lg:px-6 lg:pb-7 lg:pt-10 xl:px-8">
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
      className="campaign-journey-section relative pt-4 pb-8 md:pt-6 md:pb-10 lg:pt-8"
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
