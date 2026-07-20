export const SITE_THEME_STORAGE_KEY = "bahram-theme";
export const SITE_THEME_COOKIE_KEY = "bahram-theme";
export const LEGACY_PANEL_THEME_STORAGE_KEY = "bahram-panel-theme";

export type SiteTheme = "light" | "dark";

/** SSR fallback when no cookie — client boot script overrides from system preference. */
export const DEFAULT_SITE_THEME: SiteTheme = "dark";

/** Client-only: `prefers-color-scheme` (used when the user has not picked a theme yet). */
export function readSystemTheme(): SiteTheme {
  if (typeof window === "undefined") return DEFAULT_SITE_THEME;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Saved choice in localStorage or cookie — null means “follow system until toggled”. */
export function readStoredTheme(): SiteTheme | null {
  if (typeof window === "undefined") return null;

  const fromStorage = parseSiteTheme(localStorage.getItem(SITE_THEME_STORAGE_KEY));
  if (fromStorage) return fromStorage;

  const fromLegacy = parseSiteTheme(localStorage.getItem(LEGACY_PANEL_THEME_STORAGE_KEY));
  if (fromLegacy) return fromLegacy;

  const match = document.cookie.match(
    new RegExp(`(?:^|; )${SITE_THEME_COOKIE_KEY.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=(light|dark)`),
  );
  return parseSiteTheme(match?.[1]);
}

/**
 * Runs before paint: stored preference → else system `prefers-color-scheme`.
 * Prevents a flash when SSR cookie is missing but the OS is in light mode.
 */
export function siteThemeBootScript(): string {
  const storageKey = JSON.stringify(SITE_THEME_STORAGE_KEY);
  const legacyKey = JSON.stringify(LEGACY_PANEL_THEME_STORAGE_KEY);
  const cookieKey = JSON.stringify(SITE_THEME_COOKIE_KEY);
  return `(function(){try{var t=localStorage.getItem(${storageKey})||localStorage.getItem(${legacyKey});if(t!=="light"&&t!=="dark"){var m=document.cookie.match(new RegExp("(?:^|; )"+${cookieKey}+"=(light|dark)"));t=m?m[1]:null;}if(t!=="light"&&t!=="dark")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.setAttribute("data-theme",t);var fr=document.getElementById("family-root");if(fr)fr.setAttribute("data-family-theme",t);var pr=document.getElementById("panel-root");if(pr)pr.setAttribute("data-panel-theme",t);}catch(e){}})();`;
}

export function parseSiteTheme(value: string | null | undefined): SiteTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function siteThemeCookieValue(theme: SiteTheme): string {
  return `${SITE_THEME_COOKIE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}

/** Single source of truth for site + family + panel (client only). */
export function readResolvedTheme(): SiteTheme {
  const stored = readStoredTheme();
  if (stored) {
    if (typeof window !== "undefined") {
      const legacy = parseSiteTheme(localStorage.getItem(LEGACY_PANEL_THEME_STORAGE_KEY));
      if (legacy && !localStorage.getItem(SITE_THEME_STORAGE_KEY)) {
        try {
          localStorage.setItem(SITE_THEME_STORAGE_KEY, legacy);
        } catch {
          /* noop */
        }
      }
    }
    return stored;
  }

  return readSystemTheme();
}

/** DOM only — used when following OS theme before the user picks light/dark. */
export function syncThemeDom(theme: SiteTheme) {
  document.documentElement.setAttribute("data-theme", theme);
  document.getElementById("panel-root")?.setAttribute("data-panel-theme", theme);
  document.getElementById("family-root")?.setAttribute("data-family-theme", theme);
}

/** User choice — keeps `<html>`, roots, storage, and cookie in sync. */
export function applyResolvedTheme(theme: SiteTheme) {
  syncThemeDom(theme);
  try {
    localStorage.setItem(SITE_THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_PANEL_THEME_STORAGE_KEY);
    document.cookie = siteThemeCookieValue(theme);
  } catch {
    /* noop */
  }
}

/**
 * After hydration: apply stored preference, or follow `prefers-color-scheme` until toggled.
 * Returns a cleanup when listening for OS theme changes.
 */
export function bootstrapSiteTheme(): () => void {
  const stored = readStoredTheme();
  if (stored) {
    applyResolvedTheme(stored);
    return () => {};
  }

  const applySystem = () => syncThemeDom(readSystemTheme());
  applySystem();

  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (!readStoredTheme()) applySystem();
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}
