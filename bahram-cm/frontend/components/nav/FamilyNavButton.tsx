"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UsersRound } from "lucide-react";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { useFamilyFeedUnreadCount } from "@/lib/family/hooks/useFamilyFeedUnreadCount";
import { useFamilyRealtime } from "@/lib/family/hooks/useFamilyRealtime";

type FamilyNavButtonProps = {
  className?: string;
  /** Smaller pill for the mobile header row */
  compact?: boolean;
};

export function FamilyNavButton({ className, compact = false }: FamilyNavButtonProps) {
  const pathname = usePathname() ?? "";
  const active = navLinkMatches(pathname, "/family");
  const onFamilyRoute = pathname === "/family" || pathname.startsWith("/family/");
  const { unreadCount } = useFamilyFeedUnreadCount(!onFamilyRoute);
  useFamilyRealtime({ enabled: !onFamilyRoute });
  const showBadge = !active && unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <Link
      href="/family"
      prefetch
      aria-current={active ? "page" : undefined}
      aria-label={
        showBadge
          ? `ورود به خانواده داداش بهرام · ${badgeLabel} پست جدید`
          : "ورود به خانواده داداش بهرام"
      }
      className={cn(
        "family-nav-btn group relative inline-flex shrink-0 items-center justify-center rounded-full font-bold",
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
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
        }}
      />
      {!showBadge && !active ? (
        <span aria-hidden className="family-nav-btn__ping">
          <span className="family-nav-btn__ping-ring" />
          <span className="family-nav-btn__ping-dot" />
        </span>
      ) : null}
      <UsersRound
        className={cn("relative shrink-0", compact ? "h-3.5 w-3.5" : "h-4 w-4")}
        strokeWidth={2.25}
        aria-hidden
      />
      <span className="relative inline-flex min-w-0 items-center gap-1" dir="ltr">
        {showBadge ? (
          <span className="family-nav-btn__count" aria-hidden>
            {badgeLabel}
          </span>
        ) : null}
        <span className="truncate" dir="rtl">
          خانواده
        </span>
      </span>
    </Link>
  );
}
