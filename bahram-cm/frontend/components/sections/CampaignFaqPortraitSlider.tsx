"use client";

import { useEffect, useState } from "react";
import { SiteImage } from "@/components/ui/SiteImage";
import { cn } from "@/lib/cn";

type Slide = {
  src: string;
  alt: string;
};

export function CampaignFaqPortraitSlider({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 5200);

    return () => window.clearInterval(id);
  }, [count]);

  if (count === 0) return null;

  return (
    <div className="campaign-faq-portrait-slider relative mx-auto w-full max-w-[min(100%,17.5rem)] lg:max-w-[min(100%,19rem)]">
      <div className="relative aspect-[9/16] overflow-hidden rounded-card-lg border border-bone/10 shadow-[0_24px_48px_-28px_rgba(0,0,0,0.55)]">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            aria-hidden={i !== index}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-[var(--ease-luxe)]",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <SiteImage
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover object-center"
              sizes="(max-width: 768px) 72vw, 20vw"
            />
          </div>
        ))}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/55 to-transparent"
        />
      </div>

      {count > 1 ? (
        <div className="mt-4 flex justify-center gap-2">
          {slides.map((slide, i) => (
            <button
              key={slide.src}
              type="button"
              aria-label={`نمایش تصویر ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-pill transition-all duration-300",
                i === index ? "w-6 bg-gold" : "w-1.5 bg-bone/25 hover:bg-bone/40",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
