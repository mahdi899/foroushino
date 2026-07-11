"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { SITE_BOTTOM_NAV_ITEMS } from "./bottomNavItems";

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
        className="site-bottom-nav__icon"
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
