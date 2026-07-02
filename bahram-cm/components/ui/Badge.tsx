"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";

type Tone = "neutral" | "emerald" | "gold";

const emeraldDark =
  "border-emerald/30 bg-emerald-deep/35 text-emerald-glow shadow-[0_0_24px_-12px_rgba(47,176,127,0.6)]";
/** Paper chip: no neon glow; tint + deep green type (Tailwind wins over layered CSS). */
const emeraldLight =
  "border-emerald/22 bg-emerald/[0.085] text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_7px_22px_-14px_rgba(15,23,42,0.08)]";

const neutralTone = "border-bone/12 bg-bone/[0.03] text-bone-dim";
const goldDark = "border-gold/30 bg-gold/[0.08] text-gold";
const goldLight =
  "border-gold/26 bg-gold/[0.11] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_22px_-14px_rgba(92,77,50,0.09)]";

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  const theme = useDataTheme();

  const tones: Record<Tone, string> = {
    neutral: neutralTone,
    emerald: theme === "light" ? emeraldLight : emeraldDark,
    gold: theme === "light" ? goldLight : goldDark,
  };

  return (
    <span
      data-badge-tone={tone}
      className={cn(
        "badge group inline-flex items-center gap-2 rounded-pill border px-3 py-1 text-caption font-medium",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
