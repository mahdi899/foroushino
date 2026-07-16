"use client";

import { useLayoutEffect } from "react";
import { applyResolvedTheme, readResolvedTheme } from "@/lib/site-theme";

/**
 * Syncs client storage to <html data-theme> after SSR cookie bootstrap.
 * Replaces inline theme boot scripts (blocked by React 19 client renders).
 */
export function ThemeBoot() {
  useLayoutEffect(() => {
    applyResolvedTheme(readResolvedTheme());
    document.documentElement.setAttribute("data-theme-ready", "1");
  }, []);

  return null;
}
