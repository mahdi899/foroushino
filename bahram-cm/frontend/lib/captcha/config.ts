export const RECAPTCHA_SCRIPT_BASE = 'https://www.google.com/recaptcha/api.js';

export const RECAPTCHA_LOAD_TIMEOUT_MS = 8_000;

/** Tokens expire ~2 minutes — refresh before expiry. */
export const RECAPTCHA_TOKEN_REFRESH_MS = 90_000;

export function recaptchaScriptUrl(siteKey: string): string {
  const key = siteKey.trim();
  return `${RECAPTCHA_SCRIPT_BASE}?render=${encodeURIComponent(key)}`;
}

export function resolveRecaptchaSiteKey(apiSiteKey: string): string {
  const fromApi = apiSiteKey.trim();
  if (fromApi) return fromApi;
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? '';
}

export function isRecaptchaConfigured(siteKey: string): boolean {
  return resolveRecaptchaSiteKey(siteKey).length > 0;
}

/** @deprecated Use resolveRecaptchaSiteKey */
export const resolveTurnstileSiteKey = resolveRecaptchaSiteKey;

/** @deprecated Use isRecaptchaConfigured */
export const isTurnstileConfigured = isRecaptchaConfigured;
