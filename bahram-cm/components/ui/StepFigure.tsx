"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { liveIcon } from "@/lib/iconMotion";
import { useStepFigureIconClasses } from "@/lib/useAccentIconSurfaces";

export function StepFigure({
  stepNo,
  icon: Icon,
  tone,
  className,
  compact,
}: {
  /** اگر ست نشود، فقط آیکن نمایش داده می‌شود. */
  stepNo?: string;
  icon: LucideIcon;
  tone: "emerald" | "gold";
  className?: string;
  /** هدرهای فشرده (مثلاً آکاردئون موبایل) */
  compact?: boolean;
}) {
  const iconShell = useStepFigureIconClasses(tone, Boolean(compact));
  return (
    <div className={cn("flex items-center", stepNo ? "justify-start gap-3.5" : "justify-center", className)}>
      {stepNo ? (
        <span className="font-display text-h2 tabular-nums tracking-tight text-bone/[0.22] transition-colors duration-300 ease-[var(--ease-luxe)] group-hover:text-bone/35">
          {stepNo}
        </span>
      ) : null}
      <div
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-2xl transition-[transform,box-shadow] duration-500 ease-[var(--ease-luxe)] group-hover:scale-[1.04]",
          iconShell,
        )}
      >
        <Icon
          className={liveIcon(compact ? "size-5" : "size-[1.625rem] sm:size-7")}
          strokeWidth={1.35}
          aria-hidden
        />
      </div>
    </div>
  );
}
