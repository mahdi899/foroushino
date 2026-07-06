import type { CaptchaPublicConfig, MathCaptchaChallenge } from './types';

function captchaApiBase(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/captcha`;
  }
  return '/api/captcha';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function fallbackCaptchaConfig(): CaptchaPublicConfig {
  const envKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? '';
  return {
    enabled: true,
    site_key: envKey,
    has_turnstile: Boolean(envKey),
    honeypot_enabled: true,
    protect_newsletter: true,
    protect_leads: true,
    protect_admin_login: true,
  };
}

let configCache: CaptchaPublicConfig | null = null;
let configInflight: Promise<CaptchaPublicConfig> | null = null;

export async function fetchCaptchaPublicConfig(): Promise<CaptchaPublicConfig> {
  if (configCache) return configCache;
  if (configInflight) return configInflight;

  configInflight = (async () => {
    const res = await fetch(`${captchaApiBase()}/config`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!res.ok) {
      configCache = fallbackCaptchaConfig();
      return configCache;
    }

    const json = (await res.json()) as { data?: CaptchaPublicConfig };
    const data = json.data ?? fallbackCaptchaConfig();
    configCache = data;
    return data;
  })().finally(() => {
    configInflight = null;
  });

  return configInflight;
}

export async function fetchMathCaptcha(): Promise<MathCaptchaChallenge> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${captchaApiBase()}/math`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const json = (await res.json()) as { data?: MathCaptchaChallenge };
      if (!json.data?.id || !json.data?.question) {
        throw new Error('Invalid captcha payload');
      }

      return json.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Captcha fetch failed');
      if (attempt < 2) await sleep(350 * (attempt + 1));
    }
  }

  throw lastError ?? new Error('دریافت کپچا ناموفق بود.');
}
