"use client";

import Image from "next/image";
import {
  GraduationCap,
  Phone,
  Smartphone,
  Target,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
import { toPersianDigits } from "@/lib/persian";
import { Eyebrow } from "@/components/ui/Eyebrow";

export type SatFlowIconKey =
  | "graduation-cap"
  | "users"
  | "phone"
  | "target"
  | "trending-up"
  | "smartphone"
  | "wallet";

export type SatFlowStep = {
  title: string;
  caption: string;
  description: string;
  image: string;
  alt: string;
  icon: SatFlowIconKey;
};

const flowIcons: Record<SatFlowIconKey, LucideIcon> = {
  "graduation-cap": GraduationCap,
  users: Users,
  phone: Phone,
  target: Target,
  "trending-up": TrendingUp,
  smartphone: Smartphone,
  wallet: Wallet,
};

function resolveFlowIcon(key: SatFlowIconKey): LucideIcon {
  return flowIcons[key] ?? GraduationCap;
}

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

function flowIndex(progress: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.floor(progress * count));
}

function FlowPhoto({
  step,
  photoScale,
}: {
  step: SatFlowStep;
  photoScale?: MotionValue<number>;
}) {
  const reduce = useReducedMotion();
  const Icon = resolveFlowIcon(step.icon);

  return (
    <figure className="relative aspect-[16/10] w-full overflow-hidden rounded-card-lg border border-gold/20 sm:aspect-[5/4] sm:min-h-[14rem] md:aspect-auto md:min-h-[26rem] md:h-full">
      <motion.div
        className="absolute inset-0"
        style={photoScale && !reduce ? { scale: photoScale } : undefined}
      >
        <Image src={step.image} alt={step.alt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 50vw" />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 z-[2] p-4 md:p-6">
        <div className="rounded-card border border-bone/12 bg-ink/82 p-3.5 shadow-lg shadow-black/35 backdrop-blur-md md:p-4">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-gold/35 bg-gold/[0.12] text-gold backdrop-blur-sm">
            <Icon className="h-5 w-5" strokeWidth={1.6} aria-hidden />
          </span>
          <p className="mt-3 font-display text-xl font-semibold text-bone md:text-2xl">{step.title}</p>
          <p className="mt-1 text-sm text-bone-dim">{step.caption}</p>
          <p className="mt-2 text-sm leading-relaxed text-bone">{step.description}</p>
        </div>
      </div>
    </figure>
  );
}

function FlowStepPill({
  step,
  index,
  isActive,
  isLit,
}: {
  step: SatFlowStep;
  index: number;
  isActive: boolean;
  isLit: boolean;
}) {
  const Icon = resolveFlowIcon(step.icon);

  return (
    <motion.li
      animate={{ opacity: isLit ? 1 : 0.35, x: isActive ? 0 : isLit ? 0 : 4 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "rounded-card border px-3 py-2 transition-colors duration-500 md:px-3.5 md:py-2.5",
        isActive
          ? "border-gold/40 bg-gold/[0.1] shadow-[0_0_16px_-6px_color-mix(in_oklab,var(--color-gold)_40%,transparent)]"
          : isLit
            ? "border-bone/14 bg-charcoal/55"
            : "border-bone/8 bg-charcoal/30",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill text-[0.65rem] font-semibold ring-1 md:h-7 md:w-7",
            isActive
              ? "bg-gold/20 text-gold ring-gold/35"
              : isLit
                ? "bg-charcoal/70 text-gold/80 ring-gold/15"
                : "bg-charcoal/50 text-mist ring-bone/10",
          )}
        >
          {isActive ? <Icon className="h-3 w-3" strokeWidth={1.8} aria-hidden /> : toPersianDigits(String(index + 1))}
        </span>
        <div className="min-w-0 flex-1">
          <span className={cn("text-sm font-medium md:text-base", isActive ? "text-bone" : isLit ? "text-bone-dim" : "text-mist")}>
            {step.title}
          </span>
          {isActive ? (
            <p className="mt-1 text-sm leading-relaxed text-bone-dim md:text-base">{step.description}</p>
          ) : null}
        </div>
      </div>
    </motion.li>
  );
}

function FlowStage({
  steps,
  activeIndex,
  photoScale,
  mobile,
}: {
  steps: SatFlowStep[];
  activeIndex: number;
  photoScale?: MotionValue<number>;
  mobile?: boolean;
}) {
  const activeStep = steps[activeIndex] ?? steps[0]!;

  if (mobile) {
    return (
      <div className="mt-5 flex flex-col gap-4">
        <FlowPhoto step={activeStep} />
        <ul className="flex flex-col gap-2" aria-live="polite">
          {steps.map((step, i) => (
            <FlowStepPill key={step.title} step={step} index={i} isActive={activeIndex === i} isLit={activeIndex >= i} />
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mt-6 grid min-h-0 items-stretch gap-6 md:mt-8 md:grid-cols-2 md:gap-8 lg:gap-10">
      <div className="relative min-h-[16rem] md:min-h-[26rem]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <FlowPhoto step={activeStep} photoScale={photoScale} />
          </motion.div>
        </AnimatePresence>
      </div>

      <ul className="flex flex-col justify-center gap-2.5 md:gap-3" aria-live="polite">
        {steps.map((step, i) => (
          <FlowStepPill key={step.title} step={step} index={i} isActive={activeIndex === i} isLit={activeIndex >= i} />
        ))}
      </ul>
    </div>
  );
}

function FlowHeader({ activeIndex, total }: { activeIndex?: number; total: number }) {
  return (
    <div className="max-w-2xl min-w-0">
      <Eyebrow className="rounded-pill border border-gold/28 bg-gold/[0.06] px-3.5 py-1.5">
        مسیر کاربر
      </Eyebrow>
      <h2 className="mt-4 text-h2 text-balance text-bone">از آموزش تا کمیسیون</h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-bone-dim md:text-base">
        در سات، آموزش به اجرا وصل می‌شود. هر مرحله در سیستم ثبت می‌شود — از اولین لید تا آخرین
        کمیسیون. فروش شانسی نیست؛ قابل پیگیری است.
      </p>
      {activeIndex !== undefined ? (
        <p aria-live="polite" className="mt-2 text-caption text-gold num-latin">
          {toPersianDigits(String(activeIndex + 1))} / {toPersianDigits(String(total))}
        </p>
      ) : null}
    </div>
  );
}

function FlowScrollDriven({ steps }: { steps: SatFlowStep[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start start", "end end"],
  });

  const photoScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.1, 0.9, 1], [1, 0.5, 0.5, 0]);

  useMotionValueEvent(scrollYProgress, "change", (value) => {
    setActiveIndex(flowIndex(value, steps.length));
  });

  return (
    <div ref={trackRef} className="sat-flow-scroll-track relative">
      <div className="sat-flow-sticky-stage sticky top-14 md:top-16">
        <div className="container-luxe min-w-0 px-4 py-6 sm:px-0 md:py-8">
          <FlowHeader activeIndex={activeIndex} total={steps.length} />
          <FlowStage steps={steps} activeIndex={activeIndex} photoScale={photoScale} />
          <motion.p
            aria-hidden
            className="mt-4 text-center text-caption text-mist/70 md:mt-5"
            style={{ opacity: hintOpacity }}
          >
            اسکرول کنید — مراحل مسیر روشن می‌شوند
          </motion.p>
        </div>
      </div>
    </div>
  );
}

function FlowStatic({ steps }: { steps: SatFlowStep[] }) {
  return (
    <div className="container-luxe min-w-0 py-section-sm md:py-section">
      <FlowHeader total={steps.length} />
      <FlowStage steps={steps} activeIndex={steps.length - 1} />
    </div>
  );
}

function FlowMobile({ steps }: { steps: SatFlowStep[] }) {
  return (
    <div className="container-luxe min-w-0 px-4 py-10 sm:px-0 md:py-section-sm">
      <FlowHeader total={steps.length} />
      <FlowStage steps={steps} activeIndex={0} mobile />
    </div>
  );
}

export function SatFlowScroll({ steps }: { steps: SatFlowStep[] }) {
  const reduce = useReducedMotion();
  const mobile = useMobileLayout();

  return (
    <section aria-labelledby="sat-flow-heading" className="border-t border-gold/12 bg-obsidian">
      <h2 id="sat-flow-heading" className="sr-only">
        مسیر کاربر در سات
      </h2>
      {mobile ? (
        <FlowMobile steps={steps} />
      ) : reduce ? (
        <FlowStatic steps={steps} />
      ) : (
        <FlowScrollDriven steps={steps} />
      )}
    </section>
  );
}
