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

function FlowStepCard({ step, index }: { step: SatFlowStep; index: number }) {
  const tone = index % 2 === 0 ? "emerald" : "gold";
  const Icon = resolveFlowIcon(step.icon);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col rounded-card border border-bone/10 bg-charcoal/45 p-3.5 transition-colors duration-500 hover:border-bone/18 md:p-4",
        tone === "emerald"
          ? "hover:ring-1 hover:ring-emerald/15"
          : "hover:ring-1 hover:ring-gold/15",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-y-3 start-0 w-0.5 rounded-full",
          tone === "emerald" ? "bg-emerald-glow/70" : "bg-gold/65",
        )}
      />

      <div className="flex items-start justify-between gap-2 ps-2">
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-pill text-sm font-medium num-latin",
            tone === "emerald"
              ? "bg-emerald-deep/40 text-emerald-glow ring-1 ring-emerald/25"
              : "bg-gold/[0.1] text-gold ring-1 ring-gold/25",
          )}
        >
          {toPersianDigits(String(index + 1))}
        </span>
        <span
          className={cn(
            "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1",
            tone === "emerald"
              ? "border border-emerald/20 bg-emerald-deep/25 text-emerald-glow ring-emerald/10"
              : "border border-gold/20 bg-gold/[0.08] text-gold ring-gold/10",
          )}
        >
          <Icon className="h-3.5 w-3.5" strokeWidth={1.65} aria-hidden />
        </span>
      </div>

      <div className="mt-2.5 min-w-0 ps-2">
        <h3 className="font-display text-lg font-semibold text-bone md:text-xl">{step.title}</h3>
        <p className="mt-0.5 text-xs text-gold md:text-sm">{step.caption}</p>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
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

      <div className="container-luxe min-w-0 px-4 sm:px-0">
        <Reveal>
          <FlowHeader />
        </Reveal>

        <Reveal delay={0.08} y={20}>
          <div className="mt-6 overflow-hidden rounded-card-lg border border-bone/10 bg-charcoal/35 md:mt-8">
            <div
              aria-hidden
              className="h-px bg-gradient-to-l from-emerald-glow/70 via-gold/50 to-emerald-glow/70"
            />

            <ol className="grid grid-cols-2 gap-2.5 p-4 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4 md:gap-3.5 md:p-5">
              {steps.map((step, i) => (
                <li
                  key={step.title}
                  className={cn("min-w-0", i === steps.length - 1 && "col-span-2 lg:col-span-1")}
                >
                  <FlowStepCard step={step} index={i} />
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
