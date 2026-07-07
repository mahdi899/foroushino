"use client";

import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";
import { Reveal } from "@/components/motion/Reveal";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type CampaignLearnItem = {
  text: string;
  image: string;
  alt: string;
};

function LearnItemRow({ text, index }: { text: string; index: number }) {
  const tone = index % 2 === 0 ? "emerald" : "gold";

  return (
    <div className="flex items-start gap-4 py-4 md:gap-5 md:py-5">
      <span
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill text-base font-medium num-latin md:h-10 md:w-10",
          tone === "emerald"
            ? "bg-emerald-deep/40 text-emerald-glow ring-1 ring-emerald/25"
            : "bg-gold/[0.1] text-gold ring-1 ring-gold/25",
        )}
      >
        {toPersianDigits(String(index + 1))}
      </span>
      <p className="min-w-0 flex-1 pt-0.5 text-base leading-relaxed text-bone md:text-lg">
        <span className="sr-only">مورد {toPersianDigits(String(index + 1))}: </span>
        {text}
      </p>
    </div>
  );
}

function LearnSectionHeader({ total }: { total: number }) {
  return (
    <div className="max-w-2xl min-w-0">
      <Eyebrow>محتوای دوره</Eyebrow>
      <h2 className="mt-3 text-h2 text-balance md:mt-5">در این دوره چه چیزی یاد می‌گیری؟</h2>
      <p className="mt-3 max-w-lg text-base text-bone-dim md:mt-4 md:text-lg">
        هدف دوره این است که فقط متن ننویسی؛ بتوانی یک مسیر فروش طراحی کنی.
      </p>
      <p className="mt-2 text-sm text-gold num-latin md:mt-3 md:text-base">
        {toPersianDigits(String(total))} مورد
      </p>
    </div>
  );
}

export function CampaignLearnScroll({ items }: { items: CampaignLearnItem[] }) {
  return (
    <section
      aria-labelledby="course-learn-heading"
      className="border-t border-gold/10 bg-obsidian py-section-sm md:py-section"
    >
      <h2 id="course-learn-heading" className="sr-only">
        محتوای دوره
      </h2>

      <div className="container-luxe min-w-0">
        <Reveal>
          <LearnSectionHeader total={items.length} />
        </Reveal>

        <Reveal delay={0.08} y={20}>
          <div className="mt-8 overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/35 md:mt-10">
            <div
              aria-hidden
              className="h-px bg-gradient-to-l from-emerald-glow/70 via-gold/50 to-emerald-glow/70"
            />

            <ol className="divide-y divide-bone/8 px-4 md:px-6">
              {items.map((item, i) => (
                <li key={item.text}>
                  <LearnItemRow text={item.text} index={i} />
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
