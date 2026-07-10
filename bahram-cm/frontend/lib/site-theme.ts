export const SITE_THEME_STORAGE_KEY = "bahram-theme";
export const SITE_THEME_COOKIE_KEY = "bahram-theme";

export type SiteTheme = "light" | "dark";

export const DEFAULT_SITE_THEME: SiteTheme = "dark";

export function parseSiteTheme(value: string | null | undefined): SiteTheme | null {
  return value === "light" || value === "dark" ? value : null;
}

export function siteThemeCookieValue(theme: SiteTheme): string {
  return `${SITE_THEME_COOKIE_KEY}=${theme};path=/;max-age=31536000;SameSite=Lax`;
}
