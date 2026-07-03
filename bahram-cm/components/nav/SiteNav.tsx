"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { site } from "@/content/site";
import { navLinkMatches } from "@/lib/nav-active";
import { TrackedLinkButton } from "@/components/analytics/TrackedLinkButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { cn } from "@/lib/cn";

export function SiteNav() {
  const pathname = usePathname();
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
        <div className="container-luxe flex h-14 items-center justify-between md:h-16">
          <Logo size="sm" />

          <nav
            aria-label="ناوبری اصلی"
            className="hidden items-center lg:flex lg:gap-5 xl:gap-[1.35rem]"
          >
            {site.nav.map((link) => {
              const active = navLinkMatches(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative whitespace-nowrap rounded-md px-2 pt-1.5 pb-3 text-[0.8125rem] font-medium leading-snug transition-colors duration-300 xl:px-2.5 xl:pb-3.5",
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

          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle compact className="hidden sm:inline-flex" />
            <div className="hidden md:block">
              <TrackedLinkButton
                href={site.ctaPrimary.href}
                event="homepage_cta_click"
                eventProps={{ cta: "nav_primary", location: "nav" }}
                variant="sales"
                size="sm"
                withArrow
              >
                {site.ctaPrimary.label}
              </TrackedLinkButton>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="باز کردن منو"
              className="inline-flex h-10 w-10 items-center justify-center rounded-pill border border-bone/10 text-bone hover:border-bone/30 lg:hidden"
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
