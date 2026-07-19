import 'server-only';

import { getSettingBlob, saveSettingBlob } from '@/lib/admin/settings';
import type { CaptchaConfigAdminView, CaptchaSettingsForm, CaptchaStoredConfig } from './types';

const CAPTCHA_GROUP = 'captcha';
const CAPTCHA_KEY = 'config';

function maskSecret(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '••••••••';
  return `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}`;
}

function envRecaptchaSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || null;
}

function envRecaptchaSecretKey(): string | null {
  return process.env.RECAPTCHA_SECRET_KEY?.trim() || null;
}

function envTurnstileSiteKey(): string | null {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || null;
}

function envTurnstileSecretKey(): string | null {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || null;
}

function mergeStored(raw: Partial<CaptchaStoredConfig> | null): CaptchaStoredConfig {
  return {
    enabled: raw?.enabled ?? true,
    site_key: raw?.site_key?.trim() ?? '',
    secret_key: raw?.secret_key?.trim() || undefined,
    turnstile_site_key: raw?.turnstile_site_key?.trim() ?? '',
    turnstile_secret_key: raw?.turnstile_secret_key?.trim() || undefined,
    honeypot_enabled: raw?.honeypot_enabled ?? true,
    protect_newsletter: raw?.protect_newsletter ?? true,
    protect_leads: raw?.protect_leads ?? true,
    protect_admin_login: raw?.protect_admin_login ?? true,
  };
}

export async function getStoredCaptchaConfig(): Promise<CaptchaStoredConfig> {
  const raw = await getSettingBlob<Partial<CaptchaStoredConfig>>(CAPTCHA_GROUP, CAPTCHA_KEY);
  return mergeStored(raw);
}

export async function getCaptchaConfigAdminView(): Promise<CaptchaConfigAdminView> {
  const stored = await getStoredCaptchaConfig();
  const panelSecret = stored.secret_key?.trim();
  const panelTurnstileSecret = stored.turnstile_secret_key?.trim();

  return {
    enabled: stored.enabled,
    siteKey: stored.site_key,
    turnstileSiteKey: stored.turnstile_site_key ?? '',
    hasSecretKey: Boolean(panelSecret),
    secretKeyPreview: panelSecret ? maskSecret(panelSecret) : null,
    hasTurnstileSecretKey: Boolean(panelTurnstileSecret),
    turnstileSecretKeyPreview: panelTurnstileSecret ? maskSecret(panelTurnstileSecret) : null,
    honeypotEnabled: stored.honeypot_enabled ?? true,
    protectNewsletter: stored.protect_newsletter ?? true,
    protectLeads: stored.protect_leads ?? true,
    protectAdminLogin: stored.protect_admin_login ?? true,
    envFallback: {
      siteKey: Boolean(envRecaptchaSiteKey()),
      secretKey: Boolean(envRecaptchaSecretKey()),
      turnstileSiteKey: Boolean(envTurnstileSiteKey()),
      turnstileSecretKey: Boolean(envTurnstileSecretKey()),
    },
  };
}

export async function saveCaptchaConfig(form: CaptchaSettingsForm): Promise<{ ok: boolean; error?: string }> {
  const current = await getStoredCaptchaConfig();
  const next: CaptchaStoredConfig = {
    enabled: form.enabled,
    site_key: form.siteKey.trim(),
    turnstile_site_key: form.turnstileSiteKey.trim(),
    honeypot_enabled: form.honeypotEnabled,
    protect_newsletter: form.protectNewsletter,
    protect_leads: form.protectLeads,
    protect_admin_login: form.protectAdminLogin,
  };

  const secretInput = form.secretKeyInput.trim();
  if (secretInput) {
    next.secret_key = secretInput;
  } else if (current.secret_key) {
    next.secret_key = current.secret_key;
  }

  const turnstileSecretInput = form.turnstileSecretKeyInput.trim();
  if (turnstileSecretInput) {
    next.turnstile_secret_key = turnstileSecretInput;
  } else if (current.turnstile_secret_key) {
    next.turnstile_secret_key = current.turnstile_secret_key;
  }

  return saveSettingBlob(CAPTCHA_GROUP, CAPTCHA_KEY, next);
}
