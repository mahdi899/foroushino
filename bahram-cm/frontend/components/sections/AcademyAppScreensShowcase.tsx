"use client";

import { SiteImage } from "@/components/ui/SiteImage";
import { Reveal } from "@/components/motion/Reveal";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { cn } from "@/lib/cn";

export type AcademyShowcaseSlideData = {
  src: string;
  title: string;
  note: string;
  /** برای PhotoFrame طلایی */
  label?: string;
  alt?: string;
};

function GoldSlide({ item, compact }: { item: AcademyShowcaseSlideData; compact?: boolean }) {
  const label = item.label ?? item.title.split("—")[0]?.trim() ?? item.title;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className={cn("relative w-full", compact ? "max-w-[240px]" : "max-w-[260px]")}>
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-4 -z-[1] rounded-[36px] bg-gold/10 blur-2xl"
        />
        <PhotoFrame
          ratio="story"
          variant="radial"
          rounded="card-lg"
          label={label}
          src={item.src}
          alt={item.alt ?? item.title}
          photoCaption="none"
          className="border-gold/25 shadow-black/30 neon-surface-static ring-1 ring-gold/16"
        />
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-bone sm:mt-5 md:mt-6 md:text-h3">
        {item.title}
      </h3>
      <p className="mt-1.5 text-caption text-mist md:mt-2">{item.note}</p>
    </div>
  );
}

function EmeraldSlide({ item, compact }: { item: AcademyShowcaseSlideData; compact?: boolean }) {
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className={cn("relative w-full", compact ? "max-w-[240px]" : "max-w-[280px]")}>
        <div
          aria-hidden
          className="absolute -inset-5 -z-[1] rounded-[36px] bg-emerald-deep/30 blur-2xl"
        />
        <div
          data-neon-tone="emerald"
          className="neon-surface-static overflow-hidden rounded-[38px] border border-bone/12 bg-ink"
        >
          <SiteImage
            src={item.src}
            alt={item.alt ?? item.title}
            width={420}
            height={860}
            className="h-auto w-full"
          />
        </div>
      </div>
      <h3 className="mt-4 text-lg font-semibold leading-snug text-bone sm:mt-5 md:mt-6 md:text-h3">
        {item.title}
      </h3>
      <p className="mt-1.5 text-sm text-bone-dim md:mt-2">{item.note}</p>
    </div>
  );
}

export function AcademyAppScreensShowcase({
  items,
  variant,
  id,
}: {
  items: AcademyShowcaseSlideData[];
  variant: "gold" | "emerald";
  /** برای ناحیهٔ دسترسی */
  id?: string;
}) {
  const Slide = variant === "gold" ? GoldSlide : EmeraldSlide;
  const regionLabel =
    variant === "gold" ? "پیش‌نمایش اپ آکادمی — اسلاید افقی" : "نمای اپ — اسلاید افقی";

  return (
    <>
      <div
        id={id}
        className="mt-10 hidden gap-6 md:mt-14 md:grid md:grid-cols-3 md:gap-8 md:gap-y-10"
      >
        {items.map((item, idx) => (
          <Reveal key={item.title} delay={idx * 0.08}>
            <Slide item={item} />
          </Reveal>
        ))}
      </div>

      <div
        className="mt-8 md:hidden"
        role="region"
        aria-label={regionLabel}
      >
        <div
          className={cn(
            "flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2",
            "-mx-4 px-4",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          )}
        >
          {items.map((item) => (
            <div
              key={item.title}
              className="w-[min(calc(100vw-3.5rem),17.5rem)] shrink-0 snap-center"
            >
              <Slide item={item} compact />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
