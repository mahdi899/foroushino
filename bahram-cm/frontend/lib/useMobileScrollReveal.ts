"use client";

import { useLenis } from "lenis/react";
import { useEffect, useState } from "react";

const DESKTOP_MQ = "(min-width: 1024px)";

function readScrollY(lenisScroll?: number) {
  if (typeof lenisScroll === "number") return lenisScroll;
  return window.scrollY;
}

function isRevealed(threshold: number, lenisScroll?: number) {
  if (window.matchMedia(DESKTOP_MQ).matches) return true;
  return readScrollY(lenisScroll) > threshold;
}

/** Reveal floating UI on mobile after scroll; always visible on lg+. */
export function useMobileScrollReveal(threshold = 320) {
  const lenis = useLenis();
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let raf = 0;

    const sync = () => {
      raf = 0;
      const next = isRevealed(threshold, lenis?.scroll);
      setRevealed((prev) => (prev === next ? prev : next));
    };

    const schedule = () => {
      if (!raf) raf = window.requestAnimationFrame(sync);
    };

    sync();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    lenis?.on("scroll", schedule);

    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      lenis?.off("scroll", schedule);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [threshold, lenis]);

  return revealed;
}

/** Hide on mobile until scroll — use hidden (not translate) for fixed bottom UI. */
export const mobileScrollRevealClass = (visible: boolean) =>
  visible ? "" : "max-lg:hidden";
