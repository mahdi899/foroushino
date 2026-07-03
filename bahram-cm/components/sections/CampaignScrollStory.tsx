"use client";

import { useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Crown, Eye, Megaphone, MessageCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { site } from "@/content/site";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StepFigure } from "@/components/ui/StepFigure";
import { sitePhotos } from "@/lib/site-photo-paths";
import { toPersianDigits } from "@/lib/persian";
import { cn } from "@/lib/cn";

const icons = [Eye, MessageCircle, Megaphone, Crown];

type StoryTone = "emerald" | "gold";

function StoryPathMobileSlider() {
  const reduceMotion = useReducedMotion() ?? false;
  const baseId = useId();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const lastIndex = site.story.length - 1;

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;

    const slides = Array.from(root.querySelectorAll("[data-story-slide-index]"));

    const obs = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((e) => e.isIntersecting && e.intersectionRatio > 0.25)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0))[0];
        const el = best?.target;
        if (!(el instanceof HTMLElement)) return;
        const raw = el.dataset.storySlideIndex;
        if (raw == null) return;
        const idx = Number.parseInt(raw, 10);
        if (!Number.isNaN(idx)) setActiveIdx(idx);
      },
      {
        root,
        rootMargin: "0px -12% 0px -12%",
        threshold: [0.2, 0.35, 0.55, 0.75],
      },
    );

    slides.forEach((slide) => obs.observe(slide));
    return () => obs.disconnect();
  }, []);

  const scrollToSlide = (i: number) => {
    const root = scrollerRef.current;
    const target = root?.querySelector<HTMLElement>(
      `[data-story-slide-index="${i}"]`,
    );
    target?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  return (
    <div className="relative mx-auto mt-8 max-w-xl lg:hidden" dir="rtl">
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-0 overflow-x-auto overflow-y-visible pb-1 pt-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="گام‌های مسیر کمپین‌نویسی"
      >
        {site.story.map((frame, i) => {
          const Icon = icons[i] ?? Eye;
          const tone: StoryTone = i === 3 ? "gold" : "emerald";
          const stepNo = toPersianDigits(String(i + 1).padStart(2, "0"));

          return (
            <article
              key={frame.title}
              id={`${baseId}-slide-${i}`}
              data-story-slide-index={i}
              className="max-w-[100%] min-w-[100%] shrink-0 snap-center space-y-4 rounded-card-lg border border-bone/10 bg-charcoal/70 p-4 shadow-veil backdrop-blur-xl sm:p-5"
            >
              <div className="flex items-start gap-3">
                <StepFigure icon={Icon} tone={tone} compact />
                <div className="min-w-0 flex-1 text-start leading-tight">
                  <span className="inline-block rounded-pill bg-obsidian/80 px-2 py-1 font-display text-caption tabular-nums text-mist ring-1 ring-bone/[0.08]">
                    {stepNo}
                  </span>
                  <p className="mt-3 text-caption font-medium uppercase tracking-[0.28em] text-gold/90">
                    {frame.kicker}
                  </p>
                  <h3 className="mt-2 font-display text-[1rem] font-semibold text-balance text-bone sm:text-lg">
                    {frame.title}
                  </h3>
                </div>
              </div>
              <p className="text-sm text-bone-dim sm:text-body">
                {frame.body}
              </p>
              <PhotoFrame
                ratio="ultrawide"
                variant="radial"
                rounded="card-lg"
                showIcon={false}
                src={sitePhotos.storyStep[i]!}
                alt={`تصویر ${frame.title}`}
                photoCaption="none"
                neonTone="gold"
                interactive
                className="w-full border-bone/10"
              />
            </article>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          aria-label="گام قبلی"
          disabled={activeIdx <= 0}
          onClick={() => scrollToSlide(activeIdx - 1)}
          className={cn(
            "flex size-10 items-center justify-center rounded-pill border border-bone/15 text-bone outline-none transition-[background,color,border-color,opacity] duration-300 ease-[var(--ease-luxe)]",
            "enabled:hover:bg-bone/[0.05] enabled:hover:border-bone/35",
            "focus-visible:ring-2 focus-visible:ring-emerald-glow/45 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal",
            "disabled:cursor-not-allowed disabled:opacity-35",
          )}
        >
          <ChevronRight className="size-5" aria-hidden strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2" aria-label="انتخاب گام">
          {site.story.map((frame, i) => (
            <button
              key={frame.title}
              type="button"
              id={`${baseId}-dot-${i}`}
              aria-label={`گام ${toPersianDigits(String(i + 1))}: ${frame.title}`}
              onClick={() => scrollToSlide(i)}
              className={cn(
                "h-2.5 shrink-0 rounded-full outline-none transition-[width,background,color] duration-300 ease-[var(--ease-luxe)]",
                "focus-visible:ring-2 focus-visible:ring-emerald-glow/45 focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian",
                activeIdx === i
                  ? "w-8 bg-emerald-glow"
                  : "w-2.5 bg-bone/25 hover:bg-bone/45",
              )}
            />
          ))}
        </div>

        <button
          type="button"
          aria-label="گام بعدی"
          disabled={activeIdx >= lastIndex}
          onClick={() => scrollToSlide(activeIdx + 1)}
          className={cn(
            "flex size-10 items-center justify-center rounded-pill border border-bone/15 text-bone outline-none transition-[background,color,border-color,opacity] duration-300 ease-[var(--ease-luxe)]",
            "enabled:hover:bg-bone/[0.05] enabled:hover:border-bone/35",
            "focus-visible:ring-2 focus-visible:ring-emerald-glow/45 focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal",
            "disabled:cursor-not-allowed disabled:opacity-35",
          )}
        >
          <ChevronLeft className="size-5" aria-hidden strokeWidth={1.5} />
        </button>
      </div>

      <p className="mt-5 text-center text-sm text-mist" aria-live="polite">
        اسلاید {toPersianDigits(String(activeIdx + 1))} از{" "}
        {toPersianDigits(String(site.story.length))}
      </p>
    </div>
  );
}

export function CampaignScrollStory() {
  const ref = useRef<HTMLDivElement>(null);

  const lastIndex = site.story.length - 1;

  return (
    <section
      ref={ref}
      className="relative bg-obsidian pt-section-sm pb-section-sm md:pt-section"
      aria-label="نقشه مسیر کمپین"
    >
      <div className="container-luxe">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="min-w-0 lg:flex-1">
            <Eyebrow>نقشه‌ی مسیر</Eyebrow>
            <h2 className="mt-2 text-h2 text-balance md:mt-3">
              کمپین‌نویسی؛ تغییر هویت، نه فقط مهارت.
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-bone-dim md:text-base lg:max-w-sm lg:shrink-0 xl:max-w-md">
            <span className="lg:hidden">چهار گام؛ بکش یا با فلش جابه‌جا شو.</span>
            <span className="hidden lg:inline">چهار مرحله؛ همان نقشه‌ی دوره.</span>
          </p>
        </div>

        <StoryPathMobileSlider />

        <div className="mt-10 hidden space-y-8 lg:mt-14 lg:block lg:space-y-10">
          {site.story.map((frame, i) => {
            const Icon = icons[i] ?? Eye;
            const reverse = i % 2 === 1;
            const tone: StoryTone = i === 3 ? "gold" : "emerald";
            const stepNo = toPersianDigits(String(i + 1).padStart(2, "0"));
            const isLast = i === lastIndex;
            return (
              <article
                key={frame.title}
                className={cn(
                  "group overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/70 shadow-veil backdrop-blur-2xl",
                  "p-5 sm:p-6 md:p-8 lg:p-9",
                  isLast ? "relative" : "md:sticky md:top-24",
                )}
                style={{ zIndex: 10 + i }}
              >
                <div className="grid items-stretch gap-8 md:grid-cols-12 md:gap-10 lg:gap-12">
                  <div className={cn("md:col-span-7", reverse && "md:order-2")}>
                    <PhotoFrame
                      ratio="ultrawide"
                      variant="radial"
                      rounded="card-lg"
                      showIcon={false}
                      src={sitePhotos.storyStep[i]!}
                      alt={`تصویر ${frame.title}`}
                      photoCaption="none"
                      neonTone="gold"
                      interactive
                      className="w-full"
                    />
                  </div>

                  <div
                    className={cn(
                      "relative flex min-h-full flex-col justify-center md:col-span-5",
                      reverse && "md:order-1",
                    )}
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -start-1 top-0 font-display text-[clamp(3.5rem,8vw,5.5rem)] font-medium leading-none tabular-nums text-bone/[0.045] select-none md:-top-2"
                    >
                      {stepNo}
                    </span>

                    <div className="relative z-[1]">
                      <StepFigure stepNo={stepNo} icon={Icon} tone={tone} />
                      <p className="mt-5 text-caption font-medium uppercase tracking-[0.28em] text-gold">
                        {frame.kicker}
                      </p>
                      <h3 className="mt-3 max-w-xl text-h3 text-balance text-bone lg:text-h2 lg:leading-tight">
                        {frame.title}
                      </h3>
                      <p className="mt-4 max-w-xl text-body leading-relaxed text-bone-dim md:mt-5">
                        {frame.body}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
