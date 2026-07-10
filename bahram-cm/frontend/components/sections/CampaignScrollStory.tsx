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
  "campaign-journey-step__icon-wrap flex shrink-0 items-center justify-center";

function StepIcon({ index }: { index: number }) {
  const Icon = stepIcons[index] ?? GraduationCap;

  return (
    <span className="campaign-journey-step-icon inline-flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12 md:h-14 md:w-14 lg:h-16 lg:w-16">
      <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem] md:h-6 md:w-6" strokeWidth={1.55} aria-hidden />
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
      <span aria-hidden className="campaign-journey-step__glass" />
      <div className={iconRowClass}>
        <StepIcon index={index} />
      </div>
      <div className="campaign-journey-step__copy min-w-0">
        <p className="campaign-journey-step-tag font-display font-semibold leading-snug drop-shadow-[0_1px_10px_rgba(0,0,0,0.5)]">
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
      className="campaign-journey-step-connector campaign-journey-step-connector--lit min-w-0"
    >
      <span className="campaign-journey-step-connector-pill inline-flex h-9 w-9 items-center justify-center rounded-full">
        <ArrowLeft className="h-4 w-4" strokeWidth={1.65} />
      </span>
    </div>
  );
}

function CampaignJourneyStage() {
  const { campaignJourney } = site;
  const steps = campaignJourney.steps;

  return (
    <div className="campaign-journey-stage-wrap">
      <div className="campaign-journey-stage group/stage overflow-hidden rounded-card-lg shadow-[0_28px_56px_-36px_rgba(0,0,0,0.75)]">
        <figure className="campaign-journey-photo">
          <SiteImage
            src={stepPhotos[0]!}
            alt={stepPhotoAlts[0]!}
            fill
            className="campaign-journey-photo__img object-cover object-center transition-transform duration-700 ease-[var(--ease-luxe)] group-hover/stage:scale-[1.03]"
            sizes="(max-width: 1023px) 100vw, 80vw"
          />
          <div aria-hidden className="campaign-journey-photo-scrim" />
        </figure>

        <div className="campaign-journey-stage__content">
          <div className="campaign-journey-steps">
            {steps.map((step, i) => (
              <Fragment key={step.title}>
                <CampaignJourneyStep index={i} />
                {i < steps.length - 1 ? <CampaignJourneyConnector /> : null}
              </Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="campaign-journey-cta mt-6 md:mt-8">
        <TrackedLinkButton
          href={campaignJourney.cta.href}
          event="homepage_cta_click"
          eventProps={{ cta: "campaign_journey", location: "campaign_journey" }}
          variant="vip"
          withArrow
          size="lg"
          className="h-12 min-h-12 w-full max-w-md px-8 text-base font-bold shadow-gold sm:max-w-lg md:h-14 md:min-h-14 md:px-10 md:text-lg"
        >
          {campaignJourney.cta.label}
        </TrackedLinkButton>
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
      className="campaign-journey-section relative pt-6 pb-section-sm md:pt-8 md:pb-section lg:pt-10"
    >
      <div className="container-luxe">
        <Reveal>
          <CampaignJourneyHeader />
        </Reveal>
        <div className="mt-6 md:mt-8">
          <CampaignJourneyStage />
        </div>
      </div>
    </section>
  );
}
