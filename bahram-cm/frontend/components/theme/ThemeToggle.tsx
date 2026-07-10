"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Theme = SiteTheme;

import {
  SITE_THEME_STORAGE_KEY,
  parseSiteTheme,
  siteThemeCookieValue,
  type SiteTheme,
} from "@/lib/site-theme";

const STORAGE_KEY = SITE_THEME_STORAGE_KEY;

function readTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  const t = document.documentElement.getAttribute("data-theme");
  return t === "light" ? "light" : "dark";
}

const SIZES = {
  compact: {
    track: "h-9 w-[70px]",
    inner: "h-8",
    thumb: "h-8 w-8",
    thumbIcon: "h-[17px] w-[17px]",
    trackIcon: "h-3.5 w-3.5",
    slidePx: 30,
  },
  default: {
    track: "h-11 w-[78px]",
    inner: "h-9",
    thumb: "h-9 w-9",
    thumbIcon: "h-[19px] w-[19px]",
    trackIcon: "h-4 w-4",
    slidePx: 34,
  },
} as const;

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
  const size = compact ? SIZES.compact : SIZES.default;

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
      document.cookie = siteThemeCookieValue(next);
    } catch {
      /* noop */
    }
  };

  const isLight = theme === "light";

  return (
    <button
      type="button"
      aria-label={isLight ? "تغییر به حالت تاریک" : "تغییر به حالت روشن"}
      aria-pressed={isLight}
      onClick={toggle}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-pill border px-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition-[border-color,background-color,box-shadow] duration-500 ease-[var(--ease-luxe)]",
        isLight
          ? "border-bone/18 bg-white/75 hover:border-gold/30 hover:bg-white/90"
          : "border-bone/12 bg-charcoal/55 hover:border-bone/25 hover:bg-charcoal/70",
        size.track,
        className,
      )}
    >
      <span aria-hidden className={cn("relative w-full", size.inner)}>
        <span className="pointer-events-none absolute inset-y-0 start-2 z-0 flex items-center">
          <Moon
            className={cn(
              size.trackIcon,
              "transition-colors duration-500",
              isLight ? "text-mist/30" : "text-emerald-glow/85",
            )}
            strokeWidth={isLight ? 1.75 : 2}
            fill={isLight ? "none" : "currentColor"}
            fillOpacity={isLight ? undefined : 0.18}
            aria-hidden
          />
        </span>
        <span className="pointer-events-none absolute inset-y-0 end-2 z-0 flex items-center">
          <Sun
            className={cn(
              size.trackIcon,
              "transition-colors duration-500",
              isLight ? "text-gold" : "text-mist/30",
            )}
            strokeWidth={isLight ? 2 : 1.75}
            fill={isLight ? "currentColor" : "none"}
            fillOpacity={isLight ? 0.22 : undefined}
            aria-hidden
          />
        </span>
        <motion.span
          className={cn(
            "absolute start-0 top-0 z-10 inline-flex items-center justify-center rounded-pill transition-[background-color,box-shadow,ring-color] duration-500",
            size.thumb,
            isLight
              ? "bg-gold/20 ring-1 ring-gold/45 shadow-[0_2px_10px_rgba(255,176,0,0.22)]"
              : "bg-emerald-deep/50 ring-1 ring-emerald/45 shadow-[0_2px_10px_rgba(0,140,150,0.2)]",
          )}
          initial={false}
          animate={
            reduce
              ? undefined
              : {
                  x:
                    mounted && isLight
                      ? typeof window !== "undefined" && document?.dir === "rtl"
                        ? -size.slidePx
                        : size.slidePx
                      : 0,
                  rotate: isLight ? 180 : 0,
                }
          }
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          {isLight ? (
            <Sun
              className={cn(size.thumbIcon, "text-gold")}
              strokeWidth={2}
              fill="currentColor"
              fillOpacity={0.28}
              aria-hidden
            />
          ) : (
            <Moon
              className={cn(size.thumbIcon, "text-emerald-glow")}
              strokeWidth={2}
              fill="currentColor"
              fillOpacity={0.22}
              aria-hidden
            />
          )}
        </motion.span>
      </span>
    </button>
  );
}
