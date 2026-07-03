"use client";

import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";

/** StepFigure — square icon well (mobile accordion + desktop). */
export function useStepFigureIconClasses(tone: "emerald" | "gold", compact: boolean) {
  const theme = useDataTheme();
  const size = compact ? "size-11" : "size-14 sm:size-16";

  if (tone === "gold") {
    if (theme === "light") {
      return cn(
        size,
        "bg-gold/[0.11] text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_8px_26px_-18px_rgba(255,176,0,0.1)]",
      );
    }
    return cn(
      size,
      "bg-gold/[0.09] text-gold shadow-[0_12px_40px_-24px_rgba(255,176,0,0.42)]",
    );
  }

  if (theme === "light") {
    return cn(
      size,
      "bg-emerald/[0.11] text-emerald-deep ring-1 ring-emerald/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_28px_-20px_rgba(11,31,34,0.08)]",
    );
  }
  return cn(
    size,
    "bg-emerald-deep/50 text-emerald-glow shadow-[0_12px_40px_-24px_rgba(0,140,150,0.38)]",
  );
}

/** PressPresenceMarquee channel icon capsule. */
export function useChannelChipIconShell(isJade: boolean): { shell: string; iconClass: string } {
  const theme = useDataTheme();

  if (isJade) {
    if (theme === "light") {
      return {
        shell:
          "bg-gradient-to-br from-emerald/[0.16] to-charcoal shadow-[0_8px_20px_-14px_rgba(11,31,34,0.08)] ring-emerald/18",
        iconClass: "text-emerald-deep",
      };
    }
    return {
      shell:
        "bg-gradient-to-br from-emerald-deep/75 to-charcoal shadow-[0_0_22px_-8px_color-mix(in_oklab,var(--color-emerald-glow)_38%,transparent)] ring-emerald-glow/22",
      iconClass: "text-emerald-glow",
    };
  }

  if (theme === "light") {
    return {
      shell:
        "bg-gradient-to-br from-charcoal to-charcoal-2 shadow-[0_8px_20px_-14px_rgba(11,31,34,0.06)] ring-gold/28",
      iconClass: "text-gold",
    };
  }
  return {
    shell:
      "bg-gradient-to-br from-charcoal to-charcoal-2 shadow-[0_0_20px_-10px_color-mix(in_oklab,var(--color-gold)_32%,transparent)] ring-gold/22",
    iconClass: "text-gold-soft",
  };
}

/** BigTestimonial metric row icon wells. */
export function useEmeraldMetricIconClasses(layout: "mobile" | "desktop") {
  const theme = useDataTheme();

  if (layout === "mobile") {
    if (theme === "light") {
      return "inline-flex h-7 w-7 items-center justify-center rounded-pill bg-emerald/[0.1] ring-1 ring-emerald/20 text-emerald-deep sm:h-8 sm:w-8";
    }
    return "inline-flex h-7 w-7 items-center justify-center rounded-pill bg-emerald-deep/40 ring-1 ring-emerald/25 text-emerald-glow sm:h-8 sm:w-8";
  }

  if (theme === "light") {
    return "inline-flex h-9 w-9 items-center justify-center rounded-pill bg-emerald/[0.1] ring-1 ring-emerald/22 text-emerald-deep";
  }
  return "inline-flex h-9 w-9 items-center justify-center rounded-pill bg-emerald-deep/40 ring-1 ring-emerald/30 text-emerald-glow";
}
