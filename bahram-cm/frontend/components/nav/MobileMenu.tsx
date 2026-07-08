"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useEffect } from "react";
import { site } from "@/content/site";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { CartNavButton } from "@/components/commerce/CartNavButton";
import { PanelNavButton } from "@/components/commerce/PanelNavButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Divider } from "@/components/ui/Divider";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="منوی اصلی"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="بستن"
            onClick={onClose}
            className="absolute inset-0 bg-ink/85 backdrop-blur-xl"
          />

          {/* Panel — slides from the start (right in RTL) */}
          <motion.aside
            initial={{ x: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: reduce ? 0 : "100%", opacity: reduce ? 0 : 1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-y-0 end-0 flex h-full max-h-dvh w-[min(100%,360px)] flex-col overflow-hidden bg-obsidian shadow-veil sm:max-w-[380px]"
          >
            <header className="flex shrink-0 items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5">
              <span className="text-caption font-medium uppercase tracking-[0.22em] text-mist">
                منو
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="inline-flex h-10 min-h-10 min-w-10 w-10 items-center justify-center rounded-pill border border-bone/10 text-bone hover:border-bone/30"
              >
                <X className="h-4 w-4" aria-hidden strokeWidth={2} />
              </button>
            </header>

            <Divider className="mx-4 shrink-0 sm:mx-5" />

            <nav
              className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto overscroll-y-contain px-4 py-2 sm:px-5 sm:py-3"
              aria-label="لینک‌های اصلی"
            >
              {site.nav.map((link, i) => {
                const active = navLinkMatches(pathname, link.href);
                return (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: reduce ? 0 : 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.45,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.06 + i * 0.04,
                    }}
                  >
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex min-h-11 items-center justify-between gap-3 border-b border-bone/5 py-2.5 text-start transition-colors last:border-b-0",
                        active
                          ? "text-emerald-glow"
                          : "text-bone hover:text-emerald-glow",
                      )}
                    >
                      <span className="font-display text-[1.0625rem] font-semibold leading-snug">
                        {link.label}
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "shrink-0 text-sm tabular-nums rtl-flip transition-transform duration-300",
                          active
                            ? "text-emerald-glow"
                            : "text-mist/80 group-hover:-translate-x-0.5 group-hover:text-mist",
                        )}
                      >
                        ←
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </nav>

            <div className="shrink-0 border-t border-bone/5 px-4 py-3 sm:px-5 sm:py-4">
              <div className="mb-2.5 flex items-center justify-between gap-2 sm:mb-3">
                <span className="text-caption font-medium uppercase tracking-[0.2em] text-mist">
                  حالت نمایش
                </span>
                <ThemeToggle compact />
              </div>
              <div className="flex items-center gap-2">
                <CartNavButton showLabel className="flex-1 justify-center" onNavigate={onClose} />
                <PanelNavButton showLabel className="flex-1 justify-center" onNavigate={onClose} />
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
