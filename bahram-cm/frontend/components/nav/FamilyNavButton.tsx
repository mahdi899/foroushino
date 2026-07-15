"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";

type FamilyNavButtonProps = {
  className?: string;
  /** Smaller pill for the mobile header row */
  compact?: boolean;
};

export function FamilyNavButton({ className, compact = false }: FamilyNavButtonProps) {
  const pathname = usePathname() ?? "";
  const active = navLinkMatches(pathname, "/family");

  return (
    <Link
      href="/family"
      prefetch
      aria-current={active ? "page" : undefined}
      aria-label="ورود به خانواده داداش بهرام"
      className={cn(
        "family-nav-btn group relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold",
        "transition-[transform,box-shadow,filter] duration-300 ease-[var(--ease-luxe)]",
        "hover:scale-[1.04] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
        compact ? "h-9 gap-1 px-2.5 text-xs" : "h-10 gap-1.5 px-3.5 text-sm",
        active && "family-nav-btn--active",
        className,
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
        }}
      />
      {!active ? (
        <span aria-hidden className="family-nav-btn__ping absolute -left-0.5 -top-0.5 flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 [animation-duration:2.4s]" />
          <span className="relative inline-flex h-2 w-2 rounded-full shadow-[0_0_6px_rgba(255,224,138,0.9)]" />
        </span>
      ) : null}
      <UsersRound
        className={cn("relative shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="relative truncate">خانواده</span>
    </Link>
  );
}
