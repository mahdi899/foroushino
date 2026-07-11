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
  }, []);

  return null;
}
