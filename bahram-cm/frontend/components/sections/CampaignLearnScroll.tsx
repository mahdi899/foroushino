"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type CampaignLearnItem = {
  text: string;
  image: string;
  alt: string;
};

function useMobileLayout() {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}

function learnIndex(progress: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.floor(progress * count));
}

function LearnItemRow({
  item,
  index,
  isActive,
  isLit,
  compact,
}: {
  item: CampaignLearnItem;
  index: number;
  isActive: boolean;
  isLit: boolean;
  compact?: boolean;
}) {
  return (
    <motion.li
      layout={!compact}
      animate={
        compact
          ? undefined
          : {
              opacity: isLit ? 1 : 0.38,
              y: isActive ? 0 : isLit ? 0 : 4,
            }
      }
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "flex items-start gap-3 rounded-card border transition-colors duration-500",
        compact ? "border-bone/10 bg-charcoal/45 p-3.5" : "min-h-[4.25rem] p-4 md:min-h-[4.75rem] md:gap-4 md:p-5",
        !compact &&
          (isActive
            ? "border-emerald/35 bg-emerald-deep/20 shadow-[0_0_24px_-8px_color-mix(in_oklab,var(--color-emerald-glow)_45%,transparent)]"
            : isLit
              ? "border-bone/14 bg-charcoal/55"
              : "border-bone/8 bg-charcoal/30"),
      )}
    >
      <span
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill ring-1 transition-colors duration-500 md:h-9 md:w-9",
          compact || isActive
            ? "bg-emerald-deep/70 text-emerald-glow ring-emerald/45"
            : isLit
              ? "bg-charcoal/80 text-emerald-glow/70 ring-emerald/20"
              : "bg-charcoal/50 text-mist ring-bone/10",
        )}
      >
        <Check className="h-4 w-4" strokeWidth={isActive || compact ? 2 : 1.6} aria-hidden />
      </span>
      <p
        className={cn(
          "min-w-0 flex-1 text-sm leading-relaxed transition-colors duration-500 md:text-base",
          compact || isActive ? "font-medium text-bone" : isLit ? "text-bone-dim" : "text-mist",
        )}
      >
        <span className="sr-only">مورد {toPersianDigits(String(index + 1))}: </span>
        {item.text}
      </p>
    </motion.li>
  );
}

function LearnPhotoPanel({ item, compact }: { item: CampaignLearnItem; compact?: boolean }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-card-lg border border-bone/12 bg-charcoal/40",
        compact ? "aspect-[16/10] w-full" : "aspect-[16/10] md:aspect-auto md:min-h-[28rem] md:h-full",
      )}
    >
      <Image
        src={item.image}
        alt={item.alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, 42vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
    </div>
  );
}

function LearnScrollStage({
  items,
  activeIndex,
  mobile,
}: {
  items: CampaignLearnItem[];
  activeIndex: number;
  mobile?: boolean;
}) {
  const activeItem = items[activeIndex] ?? items[0]!;

  if (mobile) {
    return (
      <div className="mt-5 space-y-4">
        <LearnPhotoPanel item={activeItem} compact />
        <ul className="flex flex-col gap-2.5" aria-live="polite">
          {items.map((item, i) => (
            <LearnItemRow
              key={item.text}
              item={item}
              index={i}
              isActive={activeIndex === i}
              isLit={activeIndex >= i}
              compact
            />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-6 grid min-h-0 items-stretch gap-6 md:mt-8 md:grid-cols-2 md:gap-8 lg:gap-10">
      <div className="relative min-h-[14rem] md:min-h-[28rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <LearnPhotoPanel item={activeItem} />
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="flex flex-col justify-center gap-3 md:gap-3.5" aria-live="polite">
        {items.map((item, i) => (
          <LearnItemRow
            key={item.text}
            item={item}
            index={i}
            isActive={activeIndex === i}
            isLit={activeIndex >= i}
          />
        ))}
      </ul>
    </div>
  );
}

function LearnScrollDriven({ items }: { items: CampaignLearnItem[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActiveIndex(learnIndex(value, items.length));
  });

  return (
    <div ref={trackRef} className="course-learn-scroll-track relative">
      <div className="course-learn-sticky-stage sticky top-14 md:top-16">
        <div className="container-luxe py-6 md:py-8">
          <LearnSectionHeader activeIndex={activeIndex} total={items.length} />
          <LearnScrollStage items={items} activeIndex={activeIndex} />
          <motion.p
            aria-hidden
            className="mt-4 text-center text-caption text-mist/70 md:mt-5"
            initial={{ opacity: 1 }}
          >
            اسکرول کنید — هر مورد روشن‌تر می‌شود
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function LearnSectionHeader({ activeIndex, total }: { activeIndex?: number; total: number }) {
  return (
    <div className="max-w-2xl min-w-0">
      <Eyebrow>محتوای دوره</Eyebrow>
      <h2 className="mt-3 text-h2 text-balance md:mt-5">در این دوره چه چیزی یاد می‌گیری؟</h2>
      <p className="mt-3 max-w-lg text-sm text-bone-dim md:mt-4 md:text-body">
        هدف دوره این است که فقط متن ننویسی؛ بتوانی یک مسیر فروش طراحی کنی.
      </p>
      {activeIndex !== undefined ? (
        <p aria-live="polite" className="mt-2 text-caption text-gold num-latin md:mt-3">
          {toPersianDigits(String(activeIndex + 1))} / {toPersianDigits(String(total))}
        </p>
      ) : null}
    </div>
  );
}

function LearnMobile({ items }: { items: CampaignLearnItem[] }) {
  return (
    <div className="container-luxe min-w-0 py-10 md:py-section-sm">
      <LearnSectionHeader total={items.length} />
      <LearnScrollStage items={items} activeIndex={items.length - 1} mobile />
    </div>
  );
}

function LearnStatic({ items }: { items: CampaignLearnItem[] }) {
  return (
    <div className="container-luxe min-w-0 py-section-sm md:py-section">
      <LearnSectionHeader total={items.length} />
      <LearnScrollStage items={items} activeIndex={items.length - 1} />
    </div>
  );
}

export function CampaignLearnScroll({ items }: { items: CampaignLearnItem[] }) {
  const reduce = useReducedMotion();
  const mobile = useMobileLayout();

  return (
    <section aria-labelledby="course-learn-heading" className="bg-obsidian">
      <h2 id="course-learn-heading" className="sr-only">
        محتوای دوره
      </h2>
      {mobile ? (
        <LearnMobile items={items} />
      ) : reduce ? (
        <LearnStatic items={items} />
      ) : (
        <LearnScrollDriven items={items} />
      )}
    </section>
  );
}
