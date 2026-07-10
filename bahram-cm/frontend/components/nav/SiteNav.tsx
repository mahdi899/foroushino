"use client";

import Link from "next/link";
import { useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { navLinkMatches } from "@/lib/nav-active";
import { PanelNavButton } from "@/components/commerce/PanelNavButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePrefetchLinks } from "@/components/performance/PerformanceProvider";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/cn";

const SCROLL_ON = 20;
const SCROLL_OFF = 6;

function resolveScrolled(y: number, prev: boolean) {
  return prev ? y > SCROLL_OFF : y > SCROLL_ON;
}

export function SiteNav() {
  const pathname = usePathname();
  const prefetchLinks = usePrefetchLinks();
  const lenis = useLenis();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

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

  return (
    <>
      <header
        className={cn(
          "sticky top-0 inset-x-0 z-40 transition-[background-color,backdrop-filter] duration-500 ease-[var(--ease-luxe)]",
          "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border-soft after:transition-opacity after:duration-500 after:ease-[var(--ease-luxe)]",
          scrolled
            ? "bg-ink/70 backdrop-blur-2xl after:opacity-100"
            : "bg-transparent after:opacity-0",
        )}
      >
        <div className="container-luxe flex h-14 min-w-0 items-center gap-1.5 sm:gap-2 md:h-16 md:gap-3">
          <div className="flex h-10 min-w-0 shrink-0 items-center">
            <Logo size="sm" />
          </div>

          <nav
            aria-label="ناوبری اصلی"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden lg:flex xl:gap-2 2xl:gap-2.5"
          >
            {site.nav.map((link) => {
              const active = navLinkMatches(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  prefetch={prefetchLinks}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative inline-flex h-10 items-center whitespace-nowrap rounded-md px-1.5 pb-1 text-sm font-medium leading-none transition-colors duration-300 xl:px-2",
                    active ? "text-bone" : "text-bone-dim/95 hover:text-bone",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-2 bottom-0 h-[2px] rounded-full bg-gradient-to-l from-transparent via-emerald-glow to-transparent opacity-90 shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--color-emerald-glow)_58%,transparent)] transition-[transform,opacity] duration-500 ease-[var(--ease-luxe)] xl:inset-x-2.5",
                      active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-75 group-hover:scale-x-100 group-hover:opacity-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex h-10 shrink-0 items-center gap-1 sm:gap-2 md:gap-2.5">
            <ThemeToggle compact className="hidden shrink-0 sm:inline-flex" />
            <PanelNavButton
              showLabel
              className="shrink-0 max-sm:h-10 max-sm:w-10 max-sm:px-0 [&>span]:hidden sm:[&>span]:inline"
            />
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="باز کردن منو"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-bone/10 text-bone hover:border-bone/30 lg:hidden"
            >
              <Menu className="h-[1.125rem] w-[1.125rem]" aria-hidden strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </header>

      <MobileMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
