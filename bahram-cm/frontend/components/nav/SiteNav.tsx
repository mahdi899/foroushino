"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { navLinkMatches } from "@/lib/nav-active";
import { CartNavButton } from "@/components/commerce/CartNavButton";
import { PanelNavButton } from "@/components/commerce/PanelNavButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { usePrefetchLinks } from "@/components/performance/PerformanceProvider";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/cn";

export function SiteNav() {
  const pathname = usePathname();
  const prefetchLinks = usePrefetchLinks();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 transition-all duration-500 ease-[var(--ease-luxe)]",
          scrolled
            ? "border-b border-bone/5 bg-ink/70 backdrop-blur-2xl"
            : "bg-transparent",
        )}
      >
        <div className="container-luxe flex h-14 min-w-0 items-center gap-1.5 sm:gap-2 md:h-16 md:gap-3">
          <div className="min-w-0 shrink-0">
            <Logo size="sm" />
          </div>

          <nav
            aria-label="ناوبری اصلی"
            className="hidden min-w-0 flex-1 items-center justify-center gap-1 overflow-hidden lg:flex xl:gap-4 2xl:gap-5"
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
                    "group relative whitespace-nowrap rounded-md px-1.5 pt-1.5 pb-3 text-sm font-medium leading-snug transition-colors duration-300 xl:px-2.5 xl:pb-3.5",
                    active ? "text-bone" : "text-bone-dim/95 hover:text-bone",
                  )}
                >
                  {link.label}
                  <span
                    aria-hidden
                    className={cn(
                      "pointer-events-none absolute inset-x-2 bottom-1 h-[2px] rounded-full bg-gradient-to-l from-transparent via-emerald-glow to-transparent opacity-90 shadow-[0_0_14px_-2px_color-mix(in_oklab,var(--color-emerald-glow)_58%,transparent)] transition-[transform,opacity] duration-500 ease-[var(--ease-luxe)] xl:inset-x-2.5",
                      active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-75 group-hover:scale-x-100 group-hover:opacity-100",
                    )}
                  />
                </Link>
              );
            })}
          </nav>

          <div className="ms-auto flex shrink-0 items-center gap-1 sm:gap-2 md:gap-2.5">
            <ThemeToggle compact className="hidden shrink-0 sm:inline-flex" />
            <CartNavButton className="shrink-0" />
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
