"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { SITE_BOTTOM_NAV_ITEMS } from "./siteBottomNav";

type Props = {
  menuOpen?: boolean;
  onMenuOpen: () => void;
};

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <span
      className={cn(
        "site-bottom-nav__icon-shell",
        active && "site-bottom-nav__icon-shell--active",
      )}
    >
      <Icon
        size={18}
        strokeWidth={active ? 2.35 : 1.9}
        stroke={active ? "currentColor" : "url(#site-bottom-nav-icon)"}
        aria-hidden
      />
    </span>
  );
}

export function SiteBottomNav({ menuOpen = false, onMenuOpen }: Props) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="ناوبری موبایل"
      className="site-bottom-nav fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 lg:hidden"
    >
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0" focusable="false">
        <defs>
          <linearGradient id="site-bottom-nav-icon" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-emerald-deep)" />
            <stop offset="52%" stopColor="var(--color-emerald)" />
            <stop offset="100%" stopColor="var(--color-emerald-glow)" />
          </linearGradient>
        </defs>
      </svg>

      {SITE_BOTTOM_NAV_ITEMS.map((item) => {
        const { href, label, shortLabel, icon, exact } = item;
        const active = exact ? pathname === href : navLinkMatches(pathname ?? "", href);

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "site-bottom-nav__item relative flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1",
              active && "site-bottom-nav__item--active",
            )}
          >
            <NavIcon icon={icon} active={active} />
            <span className="site-bottom-nav__label">{shortLabel ?? label}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMenuOpen}
        aria-expanded={menuOpen}
        aria-label="باز کردن منو"
        className={cn(
          "site-bottom-nav__item flex min-h-[3.75rem] flex-col items-center justify-center gap-0.5 px-1",
          menuOpen && "site-bottom-nav__item--active",
        )}
      >
        <NavIcon icon={Menu} active={menuOpen} />
        <span className="site-bottom-nav__label">منو</span>
      </button>
    </nav>
  );
}
