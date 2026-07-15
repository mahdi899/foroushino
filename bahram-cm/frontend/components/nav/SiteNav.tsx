"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { navLinkMatches } from "@/lib/nav-active";
import { PanelNavButton } from "@/components/commerce/PanelNavButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePrefetchLinks } from "@/components/performance/PerformanceProvider";
import { Logo } from "./Logo";
import { FamilyNavButton } from "./FamilyNavButton";
import { MobileMenu } from "./MobileMenu";
import { SiteBottomNav } from "./SiteBottomNav";
import { cn } from "@/lib/cn";

const SCROLL_ON = 20;
const SCROLL_OFF = 6;

function resolveScrolled(y: number, prev: boolean) {
  return prev ? y > SCROLL_OFF : y > SCROLL_ON;
}

function NavLink({
  href,
  label,
  shortLabel,
  active,
  prefetch,
}: {
  href: string;
  label: string;
  shortLabel?: string;
  active: boolean;
  prefetch: boolean;
}) {

  return (
    <Link
      href={href}
      prefetch={prefetch}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative inline-flex h-10 min-w-0 max-w-full items-center whitespace-nowrap rounded-md px-1.5 pb-1 text-sm font-medium leading-none transition-colors duration-300 xl:px-2",
        active ? "text-bone" : "text-bone-dim/95 hover:text-bone",
      )}
    >
      <span className="truncate xl:hidden">{shortLabel ?? label}</span>
      <span className="hidden truncate xl:inline">{label}</span>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-l from-transparent via-emerald-glow to-transparent opacity-90 shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--color-emerald-glow)_58%,transparent)] transition-[transform,opacity] duration-500 ease-[var(--ease-luxe)] xl:inset-x-2.5",
          active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-75 group-hover:scale-x-100 group-hover:opacity-100",
        )}
      />
    </Link>
  );
}

export function SiteNav() {
  const pathname = usePathname();
  const prefetchLinks = usePrefetchLinks();
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = (y: number) => {
      setScrolled((prev) => resolveScrolled(y, prev));
    };

    if (lenis) {
      const handleLenisScroll = () => onScroll(lenis.scroll);
      handleLenisScroll();
      lenis.on("scroll", handleLenisScroll);
      return () => lenis.off("scroll", handleLenisScroll);
    }

    const handleWindowScroll = () => onScroll(window.scrollY);
    handleWindowScroll();
    window.addEventListener("scroll", handleWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleWindowScroll);
  }, [lenis]);

  const headerSurface = scrolled
    ? "bg-ink/70 backdrop-blur-2xl after:opacity-100"
    : "bg-ink/55 backdrop-blur-xl lg:bg-transparent lg:backdrop-blur-none after:opacity-0 lg:after:opacity-0";

  return (
    <>
      <header
        className={cn(
          "site-header sticky top-0 inset-x-0 z-40 transition-[background-color,backdrop-filter] duration-500 ease-[var(--ease-luxe)]",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border-soft after:transition-opacity after:duration-500 after:ease-[var(--ease-luxe)]",
          headerSurface,
          scrolled && "lg:after:opacity-100 lg:bg-ink/70 lg:backdrop-blur-2xl",
        )}
      >
        <div className="site-header__mobile container-luxe flex h-14 min-w-0 items-center gap-2.5 lg:hidden">
          <div className="flex min-w-0 flex-1 items-center">
            <Logo size="sm" showWordmark={false} />
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <FamilyNavButton compact />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <PanelNavButton showLabel={false} className="shrink-0" />
          </div>
        </div>

        <div className="site-header__desktop container-luxe hidden h-16 min-w-0 items-center gap-2 lg:flex xl:gap-3">
          <div className="flex h-10 min-w-0 shrink-0 items-center gap-2.5 xl:gap-3">
            <Logo size="sm" />
            <FamilyNavButton />
          </div>

          <nav
            aria-label="ناوبری اصلی"
            className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex xl:gap-1 2xl:gap-2"
          >
            {site.nav.map((link) => {
              const active = navLinkMatches(pathname, link.href);
              return (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  shortLabel={link.shortLabel}
                  active={active}
                  prefetch={prefetchLinks}
                />
              );
            })}
          </nav>

          <div className="ms-auto flex h-10 min-w-0 shrink-0 items-center gap-2 xl:gap-2.5">
            <ThemeToggle compact className="shrink-0" />
            <PanelNavButton showLabel className="max-w-[8.5rem] xl:max-w-[10rem]" />
          </div>
        </div>
      </header>

      <SiteBottomNav menuOpen={open} onMenuOpen={() => setOpen(true)} />
      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
