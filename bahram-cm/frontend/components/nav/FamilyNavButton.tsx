'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { useFamilyFeedUnreadCount } from "@/lib/family/hooks/useFamilyFeedUnreadCount";
import { useFamilyRealtime } from "@/lib/family/hooks/useFamilyRealtime";
import { getGlobalLastReadPostId, stashEnterUnreadAfter } from "@/lib/family/feedReadCursor";

type FamilyNavButtonProps = {
  className?: string;
  /** Smaller pill for the mobile header row */
  compact?: boolean;
};

// Option B dual-domain: Family PWA lives on its own apex (rostami.club).
// `/family` is served by `middleware.ts`, which performs the SSO handoff and
// a cross-origin redirect — that must be a real top-level navigation, not a
// Next `<Link>` client-side RSC fetch (which can choke on cross-origin
// redirects). Falls back to a normal same-origin `<Link>` when unset (local
// dev / single-domain deployments, where `/family` is just a path).
const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim() || "";

export function FamilyNavButton({ className, compact = false }: FamilyNavButtonProps) {
  const pathname = usePathname() ?? "";
  const active = navLinkMatches(pathname, "/family");
  const onFamilyRoute = pathname === "/family" || pathname.startsWith("/family/");
  const { unreadCount } = useFamilyFeedUnreadCount(!onFamilyRoute);
  useFamilyRealtime({ enabled: !onFamilyRoute });
  const showBadge = !active && unreadCount > 0;
  const badgeLabel = unreadCount > 99 ? "99+" : String(unreadCount);
  const showPing = !showBadge && !active;

  const handleClick = () => {
    // Always hand off the catch-up cursor — badge can lag behind realtime.
    const after = getGlobalLastReadPostId();
    if (after > 0) stashEnterUnreadAfter(after);
  };

  const ariaLabel = showBadge
    ? `ورود به خانواده داداش بهرام · ${badgeLabel} پست جدید`
    : "ورود به خانواده داداش بهرام";

  const linkClassName = cn(
    "family-nav-btn group relative inline-flex shrink-0 items-center justify-center rounded-full font-bold",
    "transition-[transform,box-shadow,filter] duration-300 ease-[var(--ease-luxe)]",
    "hover:scale-[1.04] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
    compact ? "h-9 gap-1 px-2.5 text-xs" : "h-10 gap-1.5 px-3.5 text-sm",
    active && "family-nav-btn--active",
    className,
  );

  const content = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background:
            "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.28) 50%, transparent 65%)",
        }}
      />
      {showPing ? (
        <span aria-hidden className="family-nav-btn__ping">
          <span className="family-nav-btn__ping-ring" />
          <span className="family-nav-btn__ping-dot" />
        </span>
      ) : null}
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
    </>
  );

  if (FAMILY_DOMAIN) {
    return (
      <a
        href="/family"
        onClick={handleClick}
        aria-current={active ? "page" : undefined}
        aria-label={ariaLabel}
        className={linkClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href="/family"
      prefetch
      onClick={handleClick}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      className={linkClassName}
    >
      {content}
    </Link>
  );
}
