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

function StepIcon({ index }: { index: number }) {
  const Icon = stepIcons[index] ?? GraduationCap;

  return (
    <span className="campaign-journey-step-icon inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl sm:h-12 sm:w-12 lg:h-14 lg:w-14 xl:h-16 xl:w-16">
      <Icon className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" strokeWidth={1.55} aria-hidden />
    </span>
  );
}

function CampaignJourneyStep({
  index,
  step,
  layout,
}: {
  index: number;
  step: (typeof site.campaignJourney.steps)[number];
  layout: "list" | "rail";
}) {
  const isList = layout === "list";

  return (
    <article
      data-step={index}
      className={cn(
        "campaign-journey-step campaign-journey-step--lit campaign-journey-step--active min-w-0",
        isList
          ? "flex items-center gap-3 border-b border-bone/10 py-3.5 text-start last:border-b-0 sm:gap-4 sm:py-4"
          : "flex flex-col items-center px-1 text-center sm:px-2",
      )}
    >
      <StepIcon index={index} />
      <div className={cn("min-w-0", isList ? "flex-1" : "w-full")}>
        <p
          className={cn(
            "campaign-journey-step-tag font-display font-semibold leading-snug text-bone",
            isList ? "text-base sm:text-lg" : "mt-3 text-base sm:mt-4 sm:text-lg xl:text-xl",
          )}
        >
          {stepTags[index]}
        </p>
        <h3
          className={cn(
            "mt-1 text-sm leading-relaxed text-bone-dim",
            isList ? "sm:text-[0.9375rem]" : "mx-auto mt-2 max-w-[12rem] sm:max-w-[13rem] xl:max-w-[14rem]",
          )}
        >
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
      className="campaign-journey-step-connector campaign-journey-step-connector--lit hidden min-w-0 items-center justify-center xl:flex"
    >
      <span className="campaign-journey-step-connector-pill inline-flex h-8 w-8 items-center justify-center rounded-full xl:h-9 xl:w-9">
        <ArrowLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" strokeWidth={1.65} />
      </span>
    </div>
  );
}

function CampaignJourneyPhoto() {
  return (
    <figure className="campaign-journey-photo relative mx-3 h-[11.5rem] w-[calc(100%-1.5rem)] shrink-0 overflow-hidden rounded-card sm:mx-4 sm:h-[13.5rem] sm:w-[calc(100%-2rem)] md:mx-5 md:h-[15.5rem] lg:mx-0 lg:h-auto lg:min-h-[22rem] lg:w-full lg:rounded-e-none lg:rounded-s-card-lg xl:min-h-[26rem]">
      <SiteImage
        src={stepPhotos[0]!}
        alt={stepPhotoAlts[0]!}
        fill
        priority
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
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:items-stretch">
        <CampaignJourneyPhoto />

        <div className="flex min-w-0 flex-col">
          <div className="flex flex-1 flex-col justify-center px-3 py-4 sm:px-5 sm:py-5 md:px-5 md:py-6 lg:px-6 lg:py-6 xl:px-8 xl:py-8">
            {/* Mobile + tablet (stacked card): vertical list */}
            <div className="campaign-journey-steps grid w-full min-w-0 grid-cols-1 gap-0 lg:hidden">
              {steps.map((step, i) => (
                <CampaignJourneyStep key={step.title} index={i} step={step} layout="list" />
              ))}
            </div>

            {/* lg–xl: vertical list inside the narrow side column */}
            <div className="campaign-journey-steps hidden w-full min-w-0 grid-cols-1 gap-0 lg:grid xl:hidden">
              {steps.map((step, i) => (
                <CampaignJourneyStep key={`lg-${step.title}`} index={i} step={step} layout="list" />
              ))}
            </div>

            {/* xl+: horizontal step rail */}
            <div className="campaign-journey-steps hidden w-full min-w-0 xl:grid xl:grid-cols-[minmax(0,1fr)_2.25rem_minmax(0,1fr)_2.25rem_minmax(0,1fr)] xl:items-start xl:gap-x-0">
              {steps.map((step, i) => (
                <Fragment key={`xl-${step.title}`}>
                  <CampaignJourneyStep index={i} step={step} layout="rail" />
                  {i < steps.length - 1 ? <CampaignJourneyConnector /> : null}
                </Fragment>
              ))}
            </div>
          </div>

          <div className="campaign-journey-footer flex justify-center border-t border-bone/10 px-3 py-4 sm:px-5 sm:py-5 lg:px-6 lg:py-6 xl:px-8">
            <TrackedLinkButton
              href={campaignJourney.cta.href}
              event="homepage_cta_click"
              eventProps={{ cta: "campaign_journey", location: "campaign_journey" }}
              variant="primary"
              withArrow
              size="lg"
              className="h-11 min-h-11 w-full max-w-lg px-5 text-sm font-semibold sm:text-base md:h-12 md:min-h-12 lg:max-w-none"
            >
              {campaignJourney.cta.label}
            </TrackedLinkButton>
          </div>
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
