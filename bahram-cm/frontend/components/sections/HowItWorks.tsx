"use client";

import { BookOpen, ChevronDown, Compass, Trophy, Users } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { CSSProperties } from "react";
import { useId, useState } from "react";
import { Reveal } from "@/components/motion/Reveal";
import { StaggerGroup, StaggerItem } from "@/components/motion/StaggerGroup";
import { dur, ease } from "@/components/motion/easings";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StepFigure } from "@/components/ui/StepFigure";
import { Chip } from "@/components/ui/Chip";
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";

const ICON_ROW = "8.85rem";
const iconRailVars = { "--how-icon-row": ICON_ROW } as CSSProperties;

const steps = [
  {
    icon: Compass,
    title: "کشف نگاه",
    body: "جایگاه و پیام واقعی تو مشخص می‌شود؛ آغاز کمپین همین است.",
    outcome: "پیام بازار",
    phaseLabel: "کشف",
  },
  {
    icon: BookOpen,
    title: "یادگیری مسیر",
    body: "۱۰ فصل کمپین‌نویسی با تمرین؛ تا اجرای واقعی.",
    outcome: "۱۰ فصل اجرا",
    phaseLabel: "ساخت مهارت",
  },
  {
    icon: Users,
    title: "ارزیابی آکادمی",
    body: "اگر جدی بودی، برای ورود به فضای خصوصی ارزیابی می‌شوی.",
    outcome: "ورود آکادمی",
    phaseLabel: "ورود انتخابی",
  },
  {
    icon: Trophy,
    title: "اجرا و رشد",
    body: "با تیم و منتور؛ کمپین حرفه‌ای و رشد پایدار.",
    outcome: "کمپین پایدار",
    phaseLabel: "اجرای حرفه‌ای",
  },
];

function FlowGlowRail({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[6%] top-[calc(var(--how-icon-row)/2)] h-px -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-glow/25 via-bone/[0.16] to-gold/[0.32] blur-[2px] sm:inset-x-[8%]"
        style={iconRailVars}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-[6%] top-[calc(var(--how-icon-row)/2)] h-[2px] -translate-y-1/2 rounded-full bg-gradient-to-l from-emerald-glow/45 via-emerald/40 to-gold/[0.45] sm:inset-x-[8%]",
          "shadow-[0_0_28px_-4px_color-mix(in_oklab,var(--color-emerald-glow)_52%,transparent),0_0_36px_-10px_color-mix(in_oklab,var(--color-gold)_42%,transparent)]",
        )}
        style={iconRailVars}
      />
      {!reduceMotion ? (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-[6%] top-[calc(var(--how-icon-row)/2)] z-[3] sm:inset-x-[8%]"
          style={iconRailVars}
        >
          <motion.span
            className="pointer-events-none absolute inset-y-[-10px] end-[-18%] w-[min(40vw,460px)] -translate-y-1/2 rounded-full bg-gradient-to-l from-transparent via-emerald-glow to-transparent opacity-[0.45] blur-2xl"
            animate={{
              insetInlineEnd: ["-35%", "102%"],
            }}
            transition={{ duration: 7.2, repeat: Number.POSITIVE_INFINITY, ease: "linear", repeatDelay: 0.4 }}
          />
        </motion.div>
      ) : null}
    </>
  );
}

type StepTone = "emerald" | "gold";

function outcomeChipClass(tone: StepTone) {
  return cn(
    "how-outcome-chip max-w-full truncate px-3 py-1 text-caption whitespace-nowrap",
    tone === "gold" ? "how-outcome-chip--gold" : "how-outcome-chip--emerald",
  );
}

function StepCard({
  step,
  tone,
  stepNo,
  stretch,
}: {
  step: (typeof steps)[number];
  tone: StepTone;
  stepNo: string;
  /** پر کردن ارتفاع سلول گرید / مسیر فلکس */
  stretch?: boolean;
}) {
  return (
    <article
      className={cn(
        "relative w-full overflow-hidden rounded-card-lg border border-bone/[0.09]",
        "bg-gradient-to-br from-charcoal/[0.86] via-obsidian/78 to-charcoal/[0.74]",
        "p-6 shadow-[var(--shadow-veil-resolved)] backdrop-blur-2xl sm:p-7",
        "transition-[border-color,transform,box-shadow] duration-500 ease-[var(--ease-luxe)]",
        "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:opacity-90",
        "before:bg-gradient-to-l before:from-emerald-glow/80 before:via-bone/25 before:to-gold/70",
        "after:pointer-events-none after:absolute after:inset-px after:rounded-[calc(var(--radius-card-lg)-3px)] after:border after:border-bone/[0.04] after:opacity-70",
        "group-hover:border-bone/[0.14] group-hover:shadow-frame",
        "group-hover:-translate-y-0.5",
        "text-start",
        stretch && "flex h-full min-h-0 flex-1 flex-col",
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute start-3 top-2 font-display text-[clamp(3.25rem,5.5vw,4.5rem)] font-medium leading-none tabular-nums text-bone/[0.045] select-none sm:start-4 sm:top-3"
      >
        {stepNo}
      </span>

      <div aria-hidden className="pointer-events-none absolute -top-16 end-[-28%] h-40 w-40 rounded-full bg-emerald-glow/[0.045] blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute bottom-[-40%] start-[-24%] h-36 w-36 rounded-full bg-gold/[0.06] blur-3xl" />

      <div className={cn("relative z-[1] flex flex-col", stretch && "min-h-0 flex-1")}>
        <p className="text-caption tracking-wide text-mist/95">{step.phaseLabel}</p>
        <div className="mt-3 min-w-0">
          <Chip className={outcomeChipClass(tone)}>
            خروجی: {step.outcome}
          </Chip>
        </div>
        <h3 className="mt-5 text-h3 text-balance text-bone">{step.title}</h3>
        <p
          className={cn(
            "mt-4 text-sm text-bone-dim sm:text-body",
            stretch && "min-h-0 flex-1",
          )}
        >
          {step.body}
        </p>
      </div>
    </article>
  );
}

function DesktopFlow() {
  const reduceMotion = useReducedMotion() ?? false;

  return (
    <div className="relative mt-10 hidden lg:mt-14 lg:block">
      <motion.div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -top-36 end-[-20%] z-0 h-72 w-[70%]",
          "bg-[radial-gradient(ellipse_at_center,var(--color-emerald-glow)_0%,transparent_72%)]",
          "opacity-35 blur-[100px]",
        )}
        animate={reduceMotion ? undefined : { opacity: [0.2, 0.38, 0.2], scale: [1, 1.04, 1] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: ease.luxe }}
      />
      <motion.div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -bottom-32 start-[-18%] z-0 h-64 w-[65%]",
          "bg-[radial-gradient(ellipse_at_center,var(--color-gold)_0%,transparent_72%)]",
          "opacity-[0.22] blur-[100px]",
        )}
        animate={reduceMotion ? undefined : { opacity: [0.12, 0.28, 0.12], scale: [1, 1.06, 1] }}
        transition={{ duration: 14, repeat: Number.POSITIVE_INFINITY, ease: ease.luxe }}
      />

      <div className="relative isolate" style={iconRailVars}>
        <FlowGlowRail reduceMotion={reduceMotion} />

        <StaggerGroup
          stagger={0.12}
          delay={0.05}
          className="relative z-[2] grid grid-cols-4 items-stretch gap-x-4 xl:gap-x-8"
        >
          {steps.map((step, i) => {
            const tone: StepTone = i === 3 ? "gold" : "emerald";
            const stepNo = toPersianDigits(String(i + 1).padStart(2, "0"));
            return (
              <StaggerItem key={step.title} className="flex h-full min-h-0 min-w-0 flex-col">
                <div className="group relative flex h-full min-h-0 w-full flex-col items-center">
                  <div className={cn("relative flex w-full min-h-[var(--how-icon-row)] flex-col items-center justify-center")}>
                    <motion.div
                      className={cn(
                        "relative rounded-[1.6rem] p-[2px]",
                        tone === "gold"
                          ? "bg-gradient-to-bl from-gold-soft/42 via-gold/25 to-emerald-glow/25"
                          : "bg-gradient-to-bl from-emerald-glow/38 via-emerald/22 to-bone/[0.12]",
                      )}
                      animate={
                        reduceMotion
                          ? undefined
                          : {
                              boxShadow: [
                                "0 0 0 rgba(255,255,255,0)",
                                "0 0 42px rgba(255,255,255,0.07)",
                                "0 0 0 rgba(255,255,255,0)",
                              ],
                            }
                      }
                      transition={{ duration: 4 + i * 0.55, repeat: Number.POSITIVE_INFINITY, ease: ease.luxe }}
                    >
                      <div className="relative rounded-[calc(1.6rem-2px)] bg-obsidian/95 px-4 py-4 shadow-frame backdrop-blur-xl">
                        <div className="absolute inset-[1px] rounded-[calc(1.6rem-3px)] border border-bone/[0.05]" aria-hidden />
                        {!reduceMotion ? (
                          <motion.span
                            aria-hidden
                            className={cn(
                              "pointer-events-none absolute inset-[-2px] rounded-[1.6rem]",
                              tone === "gold"
                                ? "bg-[radial-gradient(circle_at_30%_-10%,rgba(255,176,0,0.22),transparent_58%)]"
                                : "bg-[radial-gradient(circle_at_30%_-10%,rgba(37,160,166,0.18),transparent_58%)]",
                            )}
                            animate={{ rotate: [-3.5, 2.8, -3.5] }}
                            transition={{ duration: 7 + i, repeat: Number.POSITIVE_INFINITY, ease: ease.luxe }}
                          />
                        ) : null}
                        <motion.div
                          className="relative z-[1]"
                          whileHover={reduceMotion ? undefined : { y: -2 }}
                          transition={{ duration: dur.sm, ease: ease.luxe }}
                        >
                          <StepFigure icon={step.icon} tone={tone} />
                        </motion.div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="group mt-9 flex min-h-0 w-full flex-1">
                    <StepCard step={step} tone={tone} stepNo={stepNo} stretch />
                  </div>
                </div>
              </StaggerItem>
            );
          })}
        </StaggerGroup>
      </div>
    </div>
  );
}

function MobileFlow() {
  const reduceMotion = useReducedMotion() ?? false;
  const baseId = useId();
  /** یک مرحلهٔ باز پیش‌فرض؛ بقیه جمع تا صفحه کوتاه بماند */
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div
      className="relative mx-auto mt-8 max-w-xl lg:hidden"
      dir="rtl"
    >
      <ol className="list-none divide-y divide-bone/8 rounded-card-lg border border-bone/[0.09] bg-gradient-to-br from-charcoal/[0.86] via-obsidian/78 to-charcoal/[0.74] shadow-[var(--shadow-veil-resolved)] backdrop-blur-xl">
        {steps.map((step, i) => {
          const tone: StepTone = i === steps.length - 1 ? "gold" : "emerald";
          const stepNo = toPersianDigits(String(i + 1).padStart(2, "0"));
          const open = openIndex === i;
          const triggerId = `${baseId}-how-${i}-t`;
          const panelId = `${baseId}-how-${i}-p`;

          return (
            <li key={step.title} className="overflow-hidden">
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIndex(open ? null : i)}
                className={cn(
                  "group flex w-full items-center gap-3 px-3 py-3 text-start transition-colors sm:gap-3.5 sm:px-4",
                  "hover:bg-bone/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-glow/40 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal",
                )}
              >
                <span className="w-7 shrink-0 text-center font-display text-caption tabular-nums text-mist" aria-hidden>
                  {stepNo}
                </span>
                <div className="shrink-0">
                  <StepFigure icon={step.icon} tone={tone} compact />
                </div>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block text-caption font-medium uppercase tracking-wide text-mist/90">
                    {step.phaseLabel}
                  </span>
                  <span className="mt-0.5 block font-display text-sm font-semibold text-balance text-bone sm:text-base">
                    {step.title}
                  </span>
                </span>
                <ChevronDown
                  aria-hidden
                  strokeWidth={1.75}
                  className={cn(
                    "size-4 shrink-0 text-mist transition-transform duration-300 ease-[var(--ease-luxe)] sm:size-[1.125rem]",
                    open && "rotate-180 text-emerald-glow",
                  )}
                />
              </button>

              <AnimatePresence initial={false}>
                {open ? (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-labelledby={triggerId}
                    initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-3 border-t border-bone/[0.06] bg-obsidian/30 px-3 py-3 sm:px-4">
                      <Chip className={cn(outcomeChipClass(tone), "w-fit max-w-full truncate px-2.5 py-1 text-caption")}>
                        خروجی: {step.outcome}
                      </Chip>
                      <p className="text-sm text-bone-dim sm:text-body">
                        {step.body}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section className="relative isolate overflow-hidden py-section-sm md:py-section">

      <div className="container-luxe relative">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 lg:flex-1">
            <Reveal>
              <Eyebrow>چطور کار می‌کند</Eyebrow>
            </Reveal>
            <Reveal delay={0.08}>
              <h2 className="mt-2 text-h2 text-balance md:mt-3">چهار مرحله، یک تبدیل.</h2>
            </Reveal>
          </div>
          <Reveal delay={0.16} className="lg:max-w-sm lg:shrink-0 xl:max-w-md">
            <p className="text-sm leading-relaxed text-bone-dim md:text-base">
              <span className="lg:hidden">هر مرحله یک خروجی مشخص؛ برای جزئیات، ردیف را باز کن.</span>
              <span className="hidden lg:inline">هر مرحله خروجی روشن دارد و به مرحله‌ی بعد وصل می‌شود.</span>
            </p>
          </Reveal>
        </div>

        <DesktopFlow />
        <MobileFlow />
      </div>
    </section>
  );
}
