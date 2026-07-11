"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useDataTheme } from "@/lib/useDataTheme";
import {
  applyResolvedTheme,
  type SiteTheme,
} from "@/lib/site-theme";

const SIZES = {
  compact: {
    track: "h-9 w-[3.75rem]",
    icon: 15,
  },
  default: {
    track: "h-11 w-[4.5rem]",
    icon: 17,
  },
} as const;

function thumbOffset(isLight: boolean): string {
  if (!isLight) return "0%";
  if (typeof document !== "undefined" && document.dir === "rtl") return "-100%";
  return "100%";
}

export function ThemeToggle({
  className,
  compact,
}: {
  className?: string;
  /** Smaller footprint for dense headers (nav bar). */
  compact?: boolean;
}) {
  const theme = useDataTheme();
  const reduce = useReducedMotion();
  const size = compact ? SIZES.compact : SIZES.default;
  const isLight = theme === "light";
  const Icon = isLight ? Sun : Moon;

  const toggle = () => {
    const next: SiteTheme = theme === "dark" ? "light" : "dark";
    applyResolvedTheme(next);
  };

  return (
    <button
      type="button"
      aria-label={isLight ? "تغییر به حالت تاریک" : "تغییر به حالت روشن"}
      aria-pressed={isLight}
      onClick={toggle}
      className={cn(
        "relative inline-flex shrink-0 rounded-pill border p-0.5 transition-[border-color,background-color] duration-300 ease-[var(--ease-luxe)]",
        isLight
          ? "border-bone/20 bg-white/75 hover:border-gold/25 hover:bg-white/90"
          : "border-bone/10 bg-charcoal/45 hover:border-bone/20 hover:bg-charcoal/60",
        size.track,
        className,
      )}
    >
      <span aria-hidden className="relative block h-full w-full">
        <span className="pointer-events-none absolute inset-0 flex">
          <span className="flex flex-1 items-center justify-center">
            <Moon
              className={cn(
                "h-3 w-3 transition-opacity duration-300",
                isLight ? "text-mist/20" : "text-mist/35",
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
          <span className="flex flex-1 items-center justify-center">
            <Sun
              className={cn(
                "h-3 w-3 transition-opacity duration-300",
                isLight ? "text-mist/35" : "text-mist/20",
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </span>
        </span>

        <motion.span
          className={cn(
            "absolute inset-y-0 start-0 z-10 flex w-1/2 items-center justify-center rounded-pill",
            isLight
              ? "bg-white shadow-[0_1px_4px_rgba(11,31,34,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-black/[0.06]"
              : "bg-[#1a2426] shadow-[0_1px_4px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-white/[0.08]",
          )}
          initial={false}
          animate={{ x: thumbOffset(isLight) }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 520, damping: 34, mass: 0.8 }
          }
        >
          <Icon
            size={size.icon}
            className={isLight ? "text-gold/80" : "text-mist/70"}
            strokeWidth={2}
            aria-hidden
          />
        </motion.span>
      </span>
    </button>
  );
}
