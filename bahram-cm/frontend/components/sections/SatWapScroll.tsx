"use client";

import Image from "next/image";
import {
  BookOpen,
  Network,
  Smartphone,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/cn";
import { formatFa } from "@/lib/persian";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type SatWapIconKey = "book-open" | "smartphone" | "network";

export type SatWapPillar = {
  tag: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  icon: SatWapIconKey;
  chips: string[];
};

const wapIcons: Record<SatWapIconKey, LucideIcon> = {
  "book-open": BookOpen,
  smartphone: Smartphone,
  network: Network,
};

function resolveWapIcon(key: SatWapIconKey): LucideIcon {
  return wapIcons[key] ?? BookOpen;
}

function wapStepIndexEven(progress: number, count: number): number {
  if (count <= 1) return 0;
  const segment = 1 / count;
  return Math.min(count - 1, Math.floor(progress / segment));
}

function WapPhoto({
  pillar,
  photoScale,
}: {
  pillar: SatWapPillar;
  photoScale?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const Icon = resolveWapIcon(pillar.icon);

  return (
    <figure className="relative m-2 aspect-[5/4] min-h-[7rem] overflow-hidden rounded-card-lg border border-gold/18 sm:m-2.5 sm:min-h-[8.5rem] lg:m-0 lg:aspect-auto lg:min-h-full lg:rounded-e-none lg:rounded-s-card-lg">
      <motion.div
        className="absolute inset-0"
        style={photoScale && !reduce ? { scale: photoScale } : undefined}
      >
        <Image src={pillar.image} alt={pillar.alt} fill className="object-cover object-center" sizes="(max-width: 1023px) 100vw, 50vw" />
      </motion.div>
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-ink/20" />
      <div className="absolute inset-x-0 bottom-0 z-[2] p-2.5 md:p-3">
        <div className="rounded-card border border-bone/12 bg-ink/82 p-2.5 shadow-lg shadow-black/35 backdrop-blur-md md:p-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-gold/30 bg-gold/[0.12] text-gold">
            <Icon className="h-4 w-4" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="mt-1.5 text-caption uppercase tracking-[0.2em] text-gold">{pillar.tag}</p>
          <p className="mt-0.5 font-display text-lg font-semibold text-bone md:text-xl">{pillar.title}</p>
          <p className="mt-1 text-sm leading-relaxed text-bone">{pillar.description}</p>
        </div>
      </div>
    </figure>
  );
}

function WapPillarStep({
  pillar,
  isLit,
  isActive,
}: {
  pillar: SatWapPillar;
  isLit: boolean;
  isActive: boolean;
}) {
  const Icon = resolveWapIcon(pillar.icon);

  return (
    <motion.article
      animate={{ opacity: isLit ? 1 : 0.4, y: isLit ? 0 : 6 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-card border p-2 transition-colors duration-500 md:p-2.5",
        isActive
          ? "border-gold/35 bg-gold/[0.08]"
          : isLit
            ? "border-bone/12 bg-charcoal/50"
            : "border-bone/8 bg-charcoal/30",
      )}
    >
      <div className="flex items-start gap-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1",
            isActive
              ? "border border-gold/35 bg-gold/[0.14] text-gold ring-gold/25"
              : "border border-bone/10 bg-charcoal/60 text-gold/70 ring-bone/8",
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.55} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-caption uppercase tracking-[0.2em] text-gold">{pillar.tag}</p>
          <h3 className="mt-1 font-display text-base font-semibold text-bone md:text-lg">{pillar.title}</h3>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {pillar.chips.map((chip) => (
              <span
                key={chip}
                className={cn(
                  "rounded-pill border px-2 py-0.5 text-xs",
                  isActive
                    ? "border-gold/25 bg-gold/[0.08] text-bone"
                    : "border-bone/10 bg-charcoal/40 text-bone-dim",
                )}
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function WapPriceCard({ price }: { price: number }) {
  const priceLabel = `${formatFa(price)} تومان`;

  return (
    <div
      data-neon-tone="gold"
      className="neon-surface-static rounded-card border border-gold/25 bg-charcoal/55 p-2.5 ring-1 ring-gold/10 md:p-3"
    >
      <p className="text-caption uppercase tracking-[0.25em] text-gold">هزینه ورود</p>
      <p className="mt-1 font-display text-h3 text-bone">{priceLabel}</p>
      <p className="mt-1 text-sm text-bone-dim">
        ساختار کامل آموزشی و اجرایی — نه فقط یک دوره. نتیجه به تلاش و عملکرد فرد بستگی دارد.
      </p>
      <LinkButton href="/apply" variant="vip" size="md" withArrow className="mt-3 w-full">
        بررسی شرایط WAP
      </LinkButton>
    </div>
  );
}

function WapStage({
  pillars,
  activeStep,
  price,
  photoScale,
}: {
  pillars: SatWapPillar[];
  activeStep: number;
  price: number;
  photoScale?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const resolvedStep = reduce ? pillars.length - 1 : activeStep;
  const activePillar = pillars[resolvedStep] ?? pillars[0]!;

  return (
    <div className="sat-wap-stage min-w-0 rounded-card-lg border border-bone/10 bg-charcoal/35 overflow-hidden">
      <div className="grid lg:min-h-[14.5rem] lg:grid-cols-12 lg:items-stretch xl:min-h-[15rem]">
        <div className="relative lg:col-span-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={resolvedStep}
              className="h-full"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <WapPhoto pillar={activePillar} photoScale={photoScale} />
            </motion.div>
          </AnimatePresence>
        </div>

        <div
          className="flex flex-col justify-center gap-1.5 px-2 py-2.5 sm:px-2.5 sm:py-3 lg:col-span-6 lg:gap-2 lg:px-3 lg:py-4 lg:ps-2.5 xl:px-4 xl:py-5"
          aria-live="polite"
        >
          {pillars.map((pillar, i) => (
            <WapPillarStep
              key={pillar.title}
              pillar={pillar}
              isLit={resolvedStep >= i}
              isActive={resolvedStep === i}
            />
          ))}
          <WapPriceCard price={price} />
        </div>
      </div>
    </div>
  );
}

function WapHeader() {
  return (
    <div className="max-w-2xl min-w-0">
      <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3 py-1 text-xs md:px-3.5 md:py-1.5">
        مسیر WAP
      </Eyebrow>
      <h2 className="mt-3 text-h3 text-balance text-bone md:mt-4 md:text-h2">ورود به یک مسیر کامل</h2>
      <p className="mt-2 max-w-xl text-sm text-bone-dim">
        در WAP فقط دوره نمی‌خری؛ به آموزش کمپین‌نویسی، سیستم سات و شبکه فروش متصل می‌شوی. هزینه
        ورود، هزینه‌ی یک ساختار آموزشی و اجرایی است.
      </p>
    </div>
  );
}

function WapScrollDriven({ pillars, price }: { pillars: SatWapPillar[]; price: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.06]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1, 0.88, 1], [1, 0.55, 0.55, 0]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActiveStep(wapStepIndexEven(value, pillars.length));
  });

  return (
    <div ref={trackRef} className="sat-wap-scroll-track relative">
      <div className="sat-wap-sticky-stage sticky top-14 md:top-16">
        <div className="container-luxe min-w-0 px-4 py-4 sm:px-0 md:py-5">
          <WapHeader />
          <div className="mt-4 md:mt-5">
            <WapStage pillars={pillars} activeStep={activeStep} price={price} photoScale={photoScale} />
          </div>
          <motion.p
            aria-hidden
            className="mt-3 text-center text-caption text-mist/70"
            style={{ opacity: hintOpacity }}
          >
            اسکرول کنید — لایه‌های مسیر WAP مشخص می‌شوند
          </motion.p>
        </div>
      </div>
    </div>
  );
}

export function SatWapScroll({ pillars, price }: { pillars: SatWapPillar[]; price: number }) {
  const reduce = useReducedMotion();

  return (
    <section id="wap" aria-labelledby="sat-wap-heading" className="scroll-mt-20 border-t border-gold/10 bg-obsidian">
      <h2 id="sat-wap-heading" className="sr-only">
        مسیر WAP
      </h2>
      {reduce ? (
        <div className="container-luxe py-section-sm md:py-section">
          <WapHeader />
          <div className="mt-5 md:mt-6">
            <WapStage pillars={pillars} activeStep={pillars.length - 1} price={price} />
          </div>
        </div>
      ) : (
        <WapScrollDriven pillars={pillars} price={price} />
      )}
    </section>
  );
}
