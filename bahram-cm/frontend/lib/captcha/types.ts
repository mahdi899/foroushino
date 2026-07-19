export type CaptchaProvider = 'turnstile' | 'recaptcha' | 'math';

export interface CaptchaPayload {
  captcha_token?: string;
  captcha_provider?: CaptchaProvider;
  captcha_id?: string;
  captcha_answer?: string;
}

export interface MathCaptchaChallenge {
  id: string;
  question: string;
}

export type CaptchaMode = 'loading' | 'turnstile' | 'recaptcha' | 'math';

export type FormSecurityTarget = 'newsletter' | 'leads' | 'admin_login';

export interface CaptchaPublicConfig {
  enabled: boolean;
  /** @deprecated Prefer turnstile_site_key / recaptcha_site_key */
  site_key: string;
  turnstile_site_key: string;
  recaptcha_site_key: string;
  has_turnstile: boolean;
  has_recaptcha: boolean;
  honeypot_enabled: boolean;
  protect_newsletter: boolean;
  protect_leads: boolean;
  protect_admin_login: boolean;
}

export interface CaptchaStoredConfig {
  enabled: boolean;
  site_key: string;
  secret_key?: string;
  turnstile_site_key?: string;
  turnstile_secret_key?: string;
  honeypot_enabled?: boolean;
  protect_newsletter?: boolean;
  protect_leads?: boolean;
  protect_admin_login?: boolean;
}

export interface CaptchaConfigAdminView {
  enabled: boolean;
  siteKey: string;
  turnstileSiteKey: string;
  hasSecretKey: boolean;
  secretKeyPreview: string | null;
  hasTurnstileSecretKey: boolean;
  turnstileSecretKeyPreview: string | null;
  honeypotEnabled: boolean;
  protectNewsletter: boolean;
  protectLeads: boolean;
  protectAdminLogin: boolean;
  envFallback: {
    siteKey: boolean;
    secretKey: boolean;
    turnstileSiteKey: boolean;
    turnstileSecretKey: boolean;
  };
}

export interface CaptchaSettingsForm {
  enabled: boolean;
  turnstileSiteKey: string;
  turnstileSecretKeyInput: string;
  siteKey: string;
  secretKeyInput: string;
  honeypotEnabled: boolean;
  protectNewsletter: boolean;
  protectLeads: boolean;
  protectAdminLogin: boolean;
}

export const DEFAULT_CAPTCHA_FORM: CaptchaSettingsForm = {
  enabled: true,
  turnstileSiteKey: '',
  turnstileSecretKeyInput: '',
  siteKey: '',
  secretKeyInput: '',
  honeypotEnabled: true,
  protectNewsletter: true,
  protectLeads: true,
  protectAdminLogin: true,
};

export function isFormProtected(config: CaptchaPublicConfig | null, target: FormSecurityTarget): boolean {
  if (!config?.enabled) return false;
  if (target === 'newsletter') return config.protect_newsletter;
  if (target === 'leads') return config.protect_leads;
  return config.protect_admin_login;
}

/** Spread captcha fields for API requests. */
export function captchaToRequestFields(captcha: CaptchaPayload | null | undefined): CaptchaPayload {
  if (!captcha) return {};
  return {
    captcha_token: captcha.captcha_token,
    captcha_provider: captcha.captcha_provider,
    captcha_id: captcha.captcha_id,
    captcha_answer: captcha.captcha_answer,
  };
}
