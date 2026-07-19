import type { CaptchaConfigAdminView, CaptchaSettingsForm } from './types';

export function adminViewToForm(view: CaptchaConfigAdminView): CaptchaSettingsForm {
  return {
    enabled: view.enabled,
    turnstileSiteKey: view.turnstileSiteKey,
    turnstileSecretKeyInput: '',
    siteKey: view.siteKey,
    secretKeyInput: '',
    honeypotEnabled: view.honeypotEnabled,
    protectNewsletter: view.protectNewsletter,
    protectLeads: view.protectLeads,
    protectAdminLogin: view.protectAdminLogin,
  };
}
