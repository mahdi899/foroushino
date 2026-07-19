export const TURNSTILE_SCRIPT_BASE = 'https://challenges.cloudflare.com/turnstile/v0/api.js';

export const RECAPTCHA_SCRIPT_BASE = 'https://www.google.com/recaptcha/api.js';

export const PROVIDER_LOAD_TIMEOUT_MS = 8_000;

/** Tokens expire ~2–5 minutes — refresh before expiry. */
export const INVISIBLE_TOKEN_REFRESH_MS = 90_000;

export function turnstileScriptUrl(): string {
  return `${TURNSTILE_SCRIPT_BASE}?render=explicit`;
}

export function recaptchaScriptUrl(siteKey: string): string {
  const key = siteKey.trim();
  return `${RECAPTCHA_SCRIPT_BASE}?render=${encodeURIComponent(key)}`;
}

export function resolveTurnstileSiteKey(apiSiteKey: string): string {
  const fromApi = apiSiteKey.trim();
  if (fromApi) return fromApi;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
}

export function resolveRecaptchaSiteKey(apiSiteKey: string): string {
  const fromApi = apiSiteKey.trim();
  if (fromApi) return fromApi;
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() ?? '';
}

export function isTurnstileConfigured(siteKey: string): boolean {
  return resolveTurnstileSiteKey(siteKey).length > 0;
}

export function isRecaptchaConfigured(siteKey: string): boolean {
  return resolveRecaptchaSiteKey(siteKey).length > 0;
}
