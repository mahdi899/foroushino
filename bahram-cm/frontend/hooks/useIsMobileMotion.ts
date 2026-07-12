"use client";

import { useLayoutEffect, useState } from "react";

/** Matches Tailwind `lg` — same breakpoint as hero light entrance. */
export const MOBILE_MOTION_MQ = "(max-width: 1023px)";

export function useIsMobileMotion(): boolean {
  const [isMobile, setIsMobile] = useState(true);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MOBILE_MOTION_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
