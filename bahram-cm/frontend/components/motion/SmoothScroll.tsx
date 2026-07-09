"use client";

import { useEffect } from "react";

/** Keeps native smooth scrolling active and handles in-page anchor jumps (fixed nav offset). */
export function SmoothScroll() {
  useEffect(() => {
    const root = document.documentElement;
    root.style.scrollBehavior = "smooth";

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#']");
      if (!anchor || anchor.target === "_blank" || event.defaultPrevented) return;

      const hash = anchor.getAttribute("href");
      if (!hash || hash === "#") return;

      const target = document.querySelector(hash);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
