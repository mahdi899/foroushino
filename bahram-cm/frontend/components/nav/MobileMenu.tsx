"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect } from "react";
import { navLinkMatches } from "@/lib/nav-active";
import { cn } from "@/lib/cn";
import { PanelNavButton } from "@/components/commerce/PanelNavButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SITE_MOBILE_MENU_ITEMS } from "./siteMobileMenu";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function MobileMenu({ open, onClose }: Props) {
  const pathname = usePathname();

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
    <>
      <div
        className={cn("site-mobile-menu__scrim lg:hidden", open && "site-mobile-menu__scrim--open")}
        onClick={onClose}
        aria-hidden={!open}
      />

      <div
        className={cn("site-mobile-menu lg:hidden", open && "site-mobile-menu--open")}
        role="dialog"
        aria-modal="true"
        aria-label="منوی اصلی"
        aria-hidden={!open}
      >
        <div className="site-mobile-menu__handle" aria-hidden />

        <div className="site-mobile-menu__header">
          <div className="site-mobile-menu__brand">
            <span className="site-mobile-menu__brand-icon">
              <Menu size={20} aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-bone">منوی سایت</p>
              <p className="text-[11px] text-bone-dim/90">دسترسی سریع به بخش‌ها</p>
            </div>
          </div>
          <button
            type="button"
            className="site-mobile-menu__close"
            onClick={onClose}
            aria-label="بستن منو"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="site-mobile-menu__body" data-lenis-prevent>
          <nav className="site-mobile-nav-grid" aria-label="لینک‌های اصلی">
            {SITE_MOBILE_MENU_ITEMS.map((item) => {
              const { href, label, shortLabel, icon: Icon } = item;
              const active = navLinkMatches(pathname ?? "", href);

              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  data-active={active}
                  className="site-mobile-nav-tile"
                >
                  <span className="site-mobile-nav-tile__icon-wrap">
                    <span
                      className={cn(
                        "site-mobile-nav-tile__icon",
                        active && "site-mobile-nav-tile__icon--active",
                      )}
                    >
                      <Icon size={18} strokeWidth={2} aria-hidden />
                    </span>
                  </span>
                  <span className="site-mobile-nav-tile__label">{shortLabel ?? label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="site-mobile-menu__footer">
          <div className="site-mobile-menu__footer-grid">
            <div className="site-mobile-menu__footer-theme">
              <p className="site-mobile-menu__footer-label">حالت نمایش</p>
              <ThemeToggle compact />
            </div>
            <PanelNavButton
              showLabel
              onNavigate={onClose}
              className="site-mobile-menu__footer-panel h-11 w-full justify-center gap-2 px-3"
            />
          </div>
        </div>
      </div>
    </>
  );
}
