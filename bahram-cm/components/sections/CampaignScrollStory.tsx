import Image from "next/image";
import { ArrowLeft, Briefcase, GraduationCap, Wallet } from "lucide-react";
import { Fragment } from "react";
import { site } from "@/content/site";
import { Reveal } from "@/components/motion/Reveal";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { sitePhotos } from "@/lib/site-photo-paths";
import { toPersianDigits } from "@/lib/persian";

const stepIcons = [GraduationCap, Wallet, Briefcase] as const;
const stepTags = ["آموزش", "درآمد ماهانه", "پروژه"] as const;

const stepsGridClass =
  "sm:grid-cols-[minmax(0,1fr)_2.75rem_minmax(0,1fr)_2.75rem_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)_3rem_minmax(0,1fr)]";

function StepIcon({ index }: { index: number }) {
  const Icon = stepIcons[index] ?? GraduationCap;

  return (
    <span className="campaign-journey-step-icon inline-flex h-14 w-14 items-center justify-center rounded-2xl sm:h-16 sm:w-16 lg:h-[4.5rem] lg:w-[4.5rem]">
      <Icon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={1.55} aria-hidden />
    </span>
  );
}

export function CampaignScrollStory() {
  const { campaignJourney } = site;
  const steps = campaignJourney.steps;

  return (
    <section
      aria-labelledby="campaign-journey-heading"
      className="relative pt-4 pb-8 md:pt-6 md:pb-10 lg:pt-8"
    >
      <div className="container-luxe">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-8">
          <div className="min-w-0">
            <Reveal>
              <Eyebrow>{campaignJourney.eyebrow}</Eyebrow>
            </Reveal>
            <Reveal delay={0.05}>
              <h2
                id="campaign-journey-heading"
                className="mt-2 max-w-2xl text-balance font-display text-h3 text-bone md:mt-2.5 md:text-h2"
              >
                {campaignJourney.title}
              </h2>
            </Reveal>
          </div>
          <Reveal delay={0.08}>
            <p className="max-w-md text-sm text-bone-dim md:text-end md:text-body">
              {campaignJourney.lead}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.1}>
          <div className="campaign-journey-stage group/stage mt-5 md:mt-6">
            <div className="grid lg:min-h-[30rem] lg:grid-cols-12 lg:items-stretch xl:min-h-[32rem]">
              <figure className="campaign-journey-photo relative m-4 aspect-[5/4] min-h-[14rem] overflow-hidden rounded-card-lg sm:m-5 sm:min-h-[16rem] lg:col-span-6 lg:m-0 lg:aspect-auto lg:min-h-full lg:self-stretch lg:rounded-e-none lg:rounded-s-card-lg">
                <Image
                  src={sitePhotos.courseBackstage}
                  alt="مسیر دوره کمپین‌نویسی"
                  fill
                  className="object-cover object-center transition-transform duration-700 ease-out group-hover/stage:scale-[1.04]"
                  sizes="(max-width: 1023px) 100vw, 50vw"
                />
                <span
                  aria-hidden
                  className="campaign-journey-photo-accent pointer-events-none absolute inset-y-4 start-0 w-1.5 rounded-full lg:inset-y-0 lg:end-0 lg:start-auto lg:w-2"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-black/20"
                />
              </figure>

              <div className="flex min-h-0 flex-col px-4 pb-5 sm:px-5 sm:pb-6 lg:col-span-6 lg:min-h-full lg:px-6 lg:py-7 lg:ps-5 xl:px-8 xl:py-8">
                <div className="flex flex-1 items-center py-2 sm:py-3 lg:py-0">
                  <div className="campaign-journey-steps w-full">
                    <div
                      aria-hidden
                      className={
                        "campaign-journey-icon-rail hidden sm:grid sm:items-center " + stepsGridClass
                      }
                    >
                      {steps.map((step, i) => {
                        const isLast = i === steps.length - 1;

                        return (
                          <Fragment key={`${step.title}-rail`}>
                            <div
                              data-step={i}
                              className={
                                "campaign-journey-rail-step flex cursor-default justify-center px-2 lg:px-3 " +
                                (isLast ? "campaign-journey-step--active" : "")
                              }
                            >
                              <StepIcon index={i} />
                            </div>

                            {i < steps.length - 1 ? (
                              <div className="campaign-journey-step-connector flex items-center justify-center">
                                <span className="campaign-journey-step-connector-pill inline-flex h-9 w-9 items-center justify-center rounded-full">
                                  <ArrowLeft className="h-4 w-4" strokeWidth={1.65} />
                                </span>
                              </div>
                            ) : null}
                          </Fragment>
                        );
                      })}
                    </div>

                    <ol className="grid grid-cols-1 gap-y-10 sm:mt-5 sm:grid-cols-3 sm:gap-y-0 lg:mt-6">
                      {steps.map((step, i) => {
                        const stepNo = toPersianDigits(String(i + 1));
                        const isLast = i === steps.length - 1;

                        return (
                          <li
                            key={step.title}
                            data-step={i}
                            className={
                              "campaign-journey-step relative flex cursor-default flex-col items-center px-1 py-3 text-center sm:px-2 sm:py-4 lg:px-3 " +
                              (isLast ? "campaign-journey-step--active" : "")
                            }
                          >
                            <span className="campaign-journey-step-index sm:hidden num-latin">
                              {stepNo}
                            </span>

                            <div className="sm:hidden">
                              <StepIcon index={i} />
                            </div>

                            <p className="campaign-journey-step-tag mt-5 font-display text-xl font-semibold leading-tight text-bone sm:mt-0 lg:text-[1.375rem] xl:text-2xl">
                              {stepTags[i]}
                            </p>
                            <h3 className="mt-2.5 max-w-[12rem] text-sm leading-relaxed text-bone-dim lg:text-[0.9375rem]">
                              {step.title}
                            </h3>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                </div>

                <div className="campaign-journey-footer mt-5 flex shrink-0 flex-col gap-4 pt-2 sm:mt-6 sm:flex-row sm:items-center sm:justify-between lg:mt-0 lg:pt-4">
                  <p className="text-caption leading-relaxed text-mist">
                    یادگیری ساختاریافته
                    <span aria-hidden className="mx-1.5 text-gold/60">
                      →
                    </span>
                    درآمد ماهانه
                    <span aria-hidden className="mx-1.5 text-gold/60">
                      →
                    </span>
                    پروژه
                  </p>
                  <TrackedLinkButton
                    href={campaignJourney.cta.href}
                    event="homepage_cta_click"
                    eventProps={{ cta: "campaign_journey", location: "campaign_journey" }}
                    variant="primary"
                    withArrow
                    size="lg"
                    className="w-full shrink-0 sm:w-auto"
                  >
                    {campaignJourney.cta.label}
                  </TrackedLinkButton>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
