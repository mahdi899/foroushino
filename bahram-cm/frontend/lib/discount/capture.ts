export const DISCOUNT_COOKIE = "bahram_discount";
export const DISCOUNT_LINK_COOKIE = "bahram_discount_link";
const DISCOUNT_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function readCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeCookie(name: string, value: string, maxAge: number): void {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

function clearCookie(name: string): void {
  document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
}

/** Persists `?discount=` or `?coupon=` from the current URL into cookies. */
export function captureDiscountCodeFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("discount")?.trim() || params.get("coupon")?.trim();
  if (fromUrl) {
    writeCookie(DISCOUNT_COOKIE, fromUrl.toUpperCase(), DISCOUNT_COOKIE_MAX_AGE_SECONDS);
    writeCookie(DISCOUNT_LINK_COOKIE, "1", DISCOUNT_COOKIE_MAX_AGE_SECONDS);
    return fromUrl.toUpperCase();
  }

  return readDiscountCode();
}

export function readDiscountCode(): string | undefined {
  return readCookieValue(DISCOUNT_COOKIE)?.trim().toUpperCase() || undefined;
}

export function readDiscountViaLink(): boolean {
  return readCookieValue(DISCOUNT_LINK_COOKIE) === "1";
}

/** Saves discount code to cookie for checkout. Pass empty string to clear. */
export function setDiscountCode(code: string, viaLink = false): void {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) {
    clearCookie(DISCOUNT_COOKIE);
    clearCookie(DISCOUNT_LINK_COOKIE);
    return;
  }
  writeCookie(DISCOUNT_COOKIE, trimmed, DISCOUNT_COOKIE_MAX_AGE_SECONDS);
  if (viaLink) {
    writeCookie(DISCOUNT_LINK_COOKIE, "1", DISCOUNT_COOKIE_MAX_AGE_SECONDS);
  } else {
    clearCookie(DISCOUNT_LINK_COOKIE);
  }
}

export function captureDiscountCode(): { code?: string; viaLink: boolean } {
  const code = captureDiscountCodeFromUrl();
  return {
    code,
    viaLink: readDiscountViaLink(),
  };
}
