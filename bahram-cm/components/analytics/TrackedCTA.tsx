"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { track } from "@/lib/analytics";
import type { AnalyticsEventMap, AnalyticsEventName } from "@/lib/analytics/events";
import { cn } from "@/lib/cn";

type Size = "md" | "lg";
type Variant = "primary" | "ghost" | "sales" | "vip";

/**
 * A CTA link that fires a typed analytics event on click before navigating.
 * Keeps server pages as Server Components while still tracking conversions.
 */
export function TrackedCTA<E extends AnalyticsEventName>({
  href,
  event,
  eventProps,
  children,
  size = "md",
  variant = "primary",
  withArrow = true,
  className,
}: {
  href: string;
  event: E;
  eventProps: AnalyticsEventMap[E];
  children: React.ReactNode;
  size?: Size;
  variant?: Variant;
  withArrow?: boolean;
  className?: string;
}) {
  const base =
    "group inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-[background-color,transform,box-shadow,color] duration-300 ease-[var(--ease-luxe)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald/50";
  const sizing = size === "lg" ? "h-12 px-7 text-base" : "h-11 px-5 text-sm";
  const looks: Record<Variant, string> = {
    primary:
      "neon-btn-primary bg-emerald hover:bg-emerald-glow hover:-translate-y-px",
    ghost: "neon-btn-ghost border border-bone/20 text-bone hover:border-bone/40",
    sales: "sales-cta neon-btn-primary hover:-translate-y-px",
    vip: "neon-btn-primary neon-btn-vip shadow-gold hover:-translate-y-px",
  };

  const neonTone =
    variant === "vip" ? { "data-neon-tone": "gold" as const }
    : variant === "sales" ? { "data-neon-tone": "sales" as const }
    : {};

  return (
    <Link
      href={href}
      {...neonTone}
      className={cn(base, sizing, looks[variant], className)}
      onClick={() => track(event, eventProps)}
    >
      {children}
      {withArrow ? (
        <ArrowLeft
          className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
          aria-hidden
        />
      ) : null}
    </Link>
  );
}
