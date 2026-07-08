export const REFERRAL_COOKIE = "bahram_ref";
const REFERRAL_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function readCookieValue(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${REFERRAL_COOKIE}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function writeReferralCookie(code: string): void {
  document.cookie = `${REFERRAL_COOKIE}=${encodeURIComponent(code)};path=/;max-age=${REFERRAL_COOKIE_MAX_AGE_SECONDS};SameSite=Lax`;
}

/** Persists `?ref=` from the current URL into the referral cookie. */
export function captureReferralCodeFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;

  const fromUrl = new URLSearchParams(window.location.search).get("ref")?.trim();
  if (fromUrl) {
    writeReferralCookie(fromUrl);
    return fromUrl;
  }

  return readCookieValue();
}

export function readReferralCode(): string | undefined {
  return readCookieValue()?.trim() || undefined;
}

/** Saves referral code to cookie for checkout. Pass empty string to clear. */
export function setReferralCode(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) {
    document.cookie = `${REFERRAL_COOKIE}=;path=/;max-age=0;SameSite=Lax`;
    return;
  }
  writeReferralCookie(trimmed);
}

/** Reads referral code for checkout (URL first, then cookie). */
export function captureReferralCode(): string | undefined {
  return captureReferralCodeFromUrl();
}
