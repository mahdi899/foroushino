"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = "light" | "dark";

const STORAGE_KEY = "bahram-theme";

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? "light" : "dark";
}

export function ThemeToggle({
  className,
  compact,
}: {
  className?: string;
  /** Smaller footprint for dense headers (nav bar). */
  compact?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    startTransition(() => {
      setTheme(readTheme());
      setMounted(true);
    });
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* noop */
    }
  };

  const isLight = theme === "light";

  const slidePx = compact ? 24 : 28;
  const thumb = compact ? "h-7 w-7" : "h-8 w-8";
  const thumbIcon = compact ? "h-3.5 w-3.5" : "h-4 w-4";
  const trackIcons = compact ? "h-2.5 w-2.5" : "h-3 w-3";
  const trackH = compact ? "h-7" : "h-8";

  return (
    <button
      type="button"
      aria-label={isLight ? "تغییر به حالت تاریک" : "تغییر به حالت روشن"}
      aria-pressed={isLight}
      onClick={toggle}
      className={cn(
        "relative inline-flex items-center rounded-pill border border-bone/12 bg-charcoal/50 px-1 transition-colors duration-500 ease-[var(--ease-luxe)] hover:border-bone/25",
        compact
          ? "h-8 w-[60px]"
          : "h-10 w-[68px]",
        className,
      )}
    >
      <span aria-hidden className={cn("relative w-full", trackH)}>
        <span className="pointer-events-none absolute inset-y-0 start-1.5 z-0 flex items-center text-mist/45">
          <Moon className={trackIcons} strokeWidth={1.6} aria-hidden />
        </span>
        <span className="pointer-events-none absolute inset-y-0 end-1.5 z-0 flex items-center text-mist/45">
          <Sun className={trackIcons} strokeWidth={1.6} aria-hidden />
        </span>
        <motion.span
          className={cn(
            "absolute start-0 top-0 z-10 inline-flex items-center justify-center rounded-pill bg-emerald-deep/40 ring-1 ring-emerald/40",
            thumb,
          )}
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  x:
                    mounted && isLight
                      ? typeof window !== "undefined" && document?.dir === "rtl"
                        ? -slidePx
                        : slidePx
                      : 0,
                  rotate: isLight ? 180 : 0,
                }
          }
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {isLight ? (
            <Sun className={cn(thumbIcon, "text-gold")} strokeWidth={1.6} aria-hidden />
          ) : (
            <Moon
              className={cn(thumbIcon, "text-emerald-glow")}
              strokeWidth={1.6}
              aria-hidden
            />
          )}
        </motion.span>
      </span>
    </button>
  );
}
