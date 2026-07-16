"use client";

import { useLayoutEffect } from "react";
import {
  applyResolvedTheme,
  readResolvedTheme,
} from "@/lib/site-theme";

/** Syncs client storage to <html data-theme> after SSR cookie bootstrap. */
export function ThemeBoot() {
  useLayoutEffect(() => {
    applyResolvedTheme(readResolvedTheme());
    // Enable color transitions only after the first sync so a FOUC correction
    // is not stretched by the 0.6s html/body theme transition.
    document.documentElement.setAttribute("data-theme-ready", "1");
  }, []);

  return null;
}
