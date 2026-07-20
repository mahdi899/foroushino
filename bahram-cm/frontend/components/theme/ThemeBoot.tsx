"use client";

import { useLayoutEffect } from "react";
import { bootstrapSiteTheme } from "@/lib/site-theme";

/**
 * Syncs client theme after SSR: stored preference, else OS `prefers-color-scheme`.
 */
export function ThemeBoot() {
  useLayoutEffect(() => {
    const cleanup = bootstrapSiteTheme();
    document.documentElement.setAttribute("data-theme-ready", "1");
    return cleanup;
  }, []);

  return null;
}
