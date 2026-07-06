export const TURNSTILE_SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export const TURNSTILE_LOAD_TIMEOUT_MS = 8_000;

export function resolveTurnstileSiteKey(apiSiteKey: string): string {
  const fromApi = apiSiteKey.trim();
  if (fromApi) return fromApi;
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
}

export function isTurnstileConfigured(siteKey: string): boolean {
  return resolveTurnstileSiteKey(siteKey).length > 0;
}
