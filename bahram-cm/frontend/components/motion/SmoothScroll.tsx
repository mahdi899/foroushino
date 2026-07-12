"use client";

import { ReactLenis, useLenis } from "lenis/react";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { MOBILE_MOTION_MQ } from "@/hooks/useIsMobileMotion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import "lenis/dist/lenis.css";

const NAV_OFFSET = 72;

const LENIS_OPTIONS = {
  autoRaf: true,
  lerp: 0.08,
  smoothWheel: true,
  wheelMultiplier: 0.85,
  touchMultiplier: 1,
  anchors: { offset: NAV_OFFSET },
  stopInertiaOnNavigate: true,
} as const;

function scrollToRouteTarget(lenis?: { scrollTo: (target: string | number | HTMLElement, options?: object) => void }) {
  const hash = window.location.hash;
  if (hash) {
    const target = document.getElementById(hash.slice(1));
    if (target) {
      if (lenis) {
        lenis.scrollTo(target, { offset: -NAV_OFFSET, immediate: true, force: true });
      } else {
        target.scrollIntoView({ block: "start" });
      }
      return;
    }
  }

  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  lenis?.scrollTo(0, { immediate: true, force: true });
}

function useRouteScrollSync(lenis?: { resize?: () => void; scrollTo: (target: string | number | HTMLElement, options?: object) => void }) {
  const pathname = usePathname();

  useEffect(() => {
    const previous = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    scrollToRouteTarget(lenis);
  }, [pathname, lenis]);

  useEffect(() => {
    const resync = () => scrollToRouteTarget(lenis);

    const raf = requestAnimationFrame(() => {
      lenis?.resize?.();
      resync();
      requestAnimationFrame(resync);
    });

    window.addEventListener("load", resync, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", resync);
    };
  }, [pathname, lenis]);
}

function NativeRouteScrollSync() {
  useRouteScrollSync();
  return null;
}

function LenisRouteScrollSync() {
  const lenis = useLenis();
  useRouteScrollSync(lenis ?? undefined);
  return null;
}

function useDisableSmoothScrollOnMobile(): boolean {
  const [disabled, setDisabled] = useState(true);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MOTION_MQ);
    const sync = () => setDisabled(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return disabled;
}

export function SmoothScroll({ children }: { children: ReactNode }) {
  const reduce = usePrefersReducedMotion();
  const mobileNativeScroll = useDisableSmoothScrollOnMobile();

  if (reduce || mobileNativeScroll) {
    return (
      <>
        <NativeRouteScrollSync />
        {children}
      </>
    );
  }

  return (
    <ReactLenis root options={LENIS_OPTIONS}>
      <LenisRouteScrollSync />
      {children}
    </ReactLenis>
  );
}
