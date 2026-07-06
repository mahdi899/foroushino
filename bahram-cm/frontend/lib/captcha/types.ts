export interface CaptchaPayload {
  captcha_token?: string;
  captcha_id?: string;
  captcha_answer?: string;
}

export interface MathCaptchaChallenge {
  id: string;
  question: string;
}

export type CaptchaMode = 'loading' | 'turnstile' | 'math';

export type FormSecurityTarget = 'newsletter' | 'leads' | 'admin_login';

export interface CaptchaPublicConfig {
  enabled: boolean;
  site_key: string;
  has_turnstile: boolean;
  honeypot_enabled: boolean;
  protect_newsletter: boolean;
  protect_leads: boolean;
  protect_admin_login: boolean;
}

export interface CaptchaStoredConfig {
  enabled: boolean;
  site_key: string;
  secret_key?: string;
  honeypot_enabled?: boolean;
  protect_newsletter?: boolean;
  protect_leads?: boolean;
  protect_admin_login?: boolean;
}

export interface CaptchaConfigAdminView {
  enabled: boolean;
  siteKey: string;
  hasSecretKey: boolean;
  secretKeyPreview: string | null;
  honeypotEnabled: boolean;
  protectNewsletter: boolean;
  protectLeads: boolean;
  protectAdminLogin: boolean;
  envFallback: {
    siteKey: boolean;
    secretKey: boolean;
  };
}

export interface CaptchaSettingsForm {
  enabled: boolean;
  siteKey: string;
  secretKeyInput: string;
  honeypotEnabled: boolean;
  protectNewsletter: boolean;
  protectLeads: boolean;
  protectAdminLogin: boolean;
}

export const DEFAULT_CAPTCHA_FORM: CaptchaSettingsForm = {
  enabled: true,
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
