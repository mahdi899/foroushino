"use client";

import { useLayoutEffect } from "react";
import {
  DEFAULT_SITE_THEME,
  SITE_THEME_STORAGE_KEY,
  parseSiteTheme,
  siteThemeCookieValue,
  type SiteTheme,
} from "@/lib/site-theme";

function readStoredTheme(): SiteTheme {
  if (typeof window === "undefined") return DEFAULT_SITE_THEME;
  return parseSiteTheme(localStorage.getItem(SITE_THEME_STORAGE_KEY)) ?? DEFAULT_SITE_THEME;
}

function applyTheme(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
    document.cookie = siteThemeCookieValue(theme);
  } catch {
    /* noop */
  }
}

/** Syncs client storage to <html data-theme> after SSR cookie bootstrap. */
export function ThemeBoot() {
  useLayoutEffect(() => {
    applyTheme(readStoredTheme());
  }, []);

  return null;
}
