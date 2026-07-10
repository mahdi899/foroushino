"use client";

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
import { cn } from "@/lib/cn";
import { toPersianDigits } from "@/lib/persian";
import { Reveal } from "@/components/motion/Reveal";
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

function FlowStepCard({
  step,
  index,
  isLast,
}: {
  step: SatFlowStep;
  index: number;
  isLast: boolean;
}) {
  const tone = index % 2 === 0 ? "emerald" : "gold";
  const Icon = resolveFlowIcon(step.icon);

  return (
    <article
      className={cn(
        "group relative flex rounded-card border border-bone/10 bg-charcoal/45 transition-colors duration-500 hover:border-bone/18",
        "flex-row items-stretch gap-3 p-3 sm:flex-col sm:items-start sm:p-3.5 md:h-full md:p-4",
        tone === "emerald"
          ? "hover:ring-1 hover:ring-emerald/15"
          : "hover:ring-1 hover:ring-gold/15",
      )}
    >
      <div className="flex shrink-0 flex-col items-center sm:w-full sm:flex-row sm:items-start sm:justify-between sm:gap-2 sm:ps-2">
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-3 start-0 hidden w-0.5 rounded-full sm:block",
            tone === "emerald" ? "bg-emerald-glow/70" : "bg-gold/65",
          )}
        />

        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-pill text-xs font-medium num-latin sm:h-8 sm:w-8 sm:text-sm",
            tone === "emerald"
              ? "bg-emerald-deep/40 text-emerald-glow ring-1 ring-emerald/25"
              : "bg-gold/[0.1] text-gold ring-1 ring-gold/25",
          )}
        >
          {toPersianDigits(String(index + 1))}
        </span>

        {!isLast ? (
          <span
            aria-hidden
            className={cn(
              "mt-1.5 h-full min-h-8 w-px flex-1 bg-gradient-to-b sm:hidden",
              tone === "emerald"
                ? "from-emerald-glow/55 to-bone/10"
                : "from-gold/55 to-bone/10",
            )}
          />
        ) : null}

        <span
          className={cn(
            "hidden shrink-0 items-center justify-center rounded-xl ring-1 sm:inline-flex sm:h-8 sm:w-8",
            tone === "emerald"
              ? "border border-emerald/20 bg-emerald-deep/25 text-emerald-glow ring-emerald/10"
              : "border border-gold/20 bg-gold/[0.08] text-gold ring-gold/10",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.65} aria-hidden />
        </span>
      </div>

      <div className="min-w-0 flex-1 sm:mt-2.5 sm:ps-2">
        <div className="flex items-start gap-2">
          <span
            className={cn(
              "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ring-1 sm:hidden",
              tone === "emerald"
                ? "border border-emerald/20 bg-emerald-deep/25 text-emerald-glow ring-emerald/10"
                : "border border-gold/20 bg-gold/[0.08] text-gold ring-gold/10",
            )}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.65} aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold leading-snug text-bone sm:text-lg md:text-xl">
              {step.title}
            </h3>
            <p className="mt-0.5 text-[0.6875rem] leading-snug text-gold sm:text-xs md:text-sm">
              {step.caption}
            </p>
          </div>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim sm:mt-2">
          <span className="sr-only">
            مرحله {toPersianDigits(String(index + 1))}: {step.title}.{" "}
          </span>
          {step.description}
        </p>
      </div>
    </article>
  );
}

function FlowHeader() {
  return (
    <div className="max-w-2xl min-w-0 lg:max-w-none">
      <Eyebrow>مسیر کاربر</Eyebrow>
      <h2 className="mt-3 text-h2 text-balance text-bone md:mt-5">از آموزش تا کمیسیون</h2>
      <p className="mt-3 max-w-xl text-base leading-relaxed text-bone-dim md:mt-4 md:text-lg">
        در سات، آموزش به اجرا وصل می‌شود. هر مرحله در سیستم ثبت می‌شود — از اولین لید تا آخرین
        کمیسیون. فروش شانسی نیست؛ قابل پیگیری است.
      </p>
    </div>
  );
}

export function SatFlowScroll({ steps }: { steps: SatFlowStep[] }) {
  return (
    <section
      aria-labelledby="sat-flow-heading"
      className="border-t border-gold/10 bg-obsidian py-section-sm md:py-section"
    >
      <h2 id="sat-flow-heading" className="sr-only">
        مسیر کاربر در سات
      </h2>

      <div className="container-luxe min-w-0">
        <Reveal>
          <FlowHeader />
        </Reveal>

        <Reveal delay={0.08} y={20}>
          <div className="mt-6 overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/35 md:mt-8">
            <div
              aria-hidden
              className="h-px bg-gradient-to-l from-emerald-glow/70 via-gold/50 to-emerald-glow/70"
            />

            <ol className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 sm:gap-3 sm:p-4 lg:grid-cols-3 xl:grid-cols-4 md:gap-3.5 md:p-5">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className={cn(
                    "min-w-0",
                    i === steps.length - 1 && steps.length % 2 === 1 && "sm:col-span-2 lg:col-span-1",
                  )}
                >
                  <FlowStepCard step={step} index={i} isLast={i === steps.length - 1} />
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
