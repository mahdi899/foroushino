"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";

type Tone = "neutral" | "emerald" | "gold" | "sales";

const emeraldDark =
  "border-emerald/32 bg-emerald-deep/35 text-emerald-glow shadow-[0_0_18px_rgba(0,140,150,0.18)]";
const emeraldLight =
  "border-emerald/18 bg-emerald/[0.085] text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_7px_22px_-14px_rgba(11,31,34,0.08)]";

const neutralTone =
  "border-border-soft bg-bone/[0.03] text-bone-dim";
const goldDark =
  "border-gold/30 bg-gold/[0.10] text-gold-soft shadow-[0_0_18px_rgba(255,176,0,0.18)]";
const goldLight =
  "border-gold/24 bg-gold/[0.13] text-[#7a4f00] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_7px_22px_-14px_rgba(255,176,0,0.09)]";

const salesDark = "border-sales/32 bg-sales/[0.12] text-sales-soft";
const salesLight = "border-sales/22 bg-sales/[0.11] text-[#b84300]";

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
    sales: theme === "light" ? salesLight : salesDark,
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
