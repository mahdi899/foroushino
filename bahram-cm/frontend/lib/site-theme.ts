export const SITE_THEME_STORAGE_KEY = "bahram-theme";
export const SITE_THEME_COOKIE_KEY = "bahram-theme";
export const LEGACY_PANEL_THEME_STORAGE_KEY = "bahram-panel-theme";

export type SiteTheme = "light" | "dark";

export const DEFAULT_SITE_THEME: SiteTheme = "dark";

export function parseSiteTheme(value: string | null | undefined): SiteTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function siteThemeCookieValue(theme: SiteTheme): string {
  return `${SITE_THEME_COOKIE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}

/** Single source of truth for site + student panel (client only). */
export function readResolvedTheme(): SiteTheme {
  if (typeof window === "undefined") return DEFAULT_SITE_THEME;

  const fromStorage = parseSiteTheme(localStorage.getItem(SITE_THEME_STORAGE_KEY));
  if (fromStorage) return fromStorage;

  const fromLegacy = parseSiteTheme(localStorage.getItem(LEGACY_PANEL_THEME_STORAGE_KEY));
  if (fromLegacy) {
    try {
      localStorage.setItem(SITE_THEME_STORAGE_KEY, fromLegacy);
    } catch {
      /* noop */
    }
    return fromLegacy;
  }

  const fromHtml = parseSiteTheme(document.documentElement.getAttribute("data-theme"));
  if (fromHtml) return fromHtml;

  const fromPanelRoot = parseSiteTheme(
    document.getElementById("panel-root")?.getAttribute("data-panel-theme"),
  );
  if (fromPanelRoot) return fromPanelRoot;

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Keeps `<html data-theme>`, panel root, storage, and cookie in sync. */
export function applyResolvedTheme(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("panel-root")?.setAttribute("data-panel-theme", theme);
  try {
    localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_PANEL_THEME_STORAGE_KEY);
    document.cookie = siteThemeCookieValue(theme);
  } catch {
    /* noop */
  }
}
