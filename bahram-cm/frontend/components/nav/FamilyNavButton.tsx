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

import { familyHomeHref } from '@/lib/domains';

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

  const familyHref = familyHomeHref();

  if (familyHref.startsWith('http')) {
    return (
      <a
        href={familyHref}
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
      href={familyHref}
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
