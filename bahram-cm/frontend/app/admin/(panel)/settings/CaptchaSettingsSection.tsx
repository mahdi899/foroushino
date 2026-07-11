'use client';

import { ShieldCheck } from 'lucide-react';
import type { CaptchaSettingsForm } from '@/lib/captcha/types';

interface CaptchaSettingsSectionProps {
  form: CaptchaSettingsForm;
  hasSecretKey: boolean;
  secretKeyPreview: string | null;
  envFallback: { siteKey: boolean; secretKey: boolean };
  onChange: (form: CaptchaSettingsForm) => void;
}

function ToggleRow({
  checked,
  disabled,
  label,
  hint,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  hint?: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-small text-text">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-[var(--color-primary)]"
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-caption text-text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function CaptchaSettingsSection({
  form,
  hasSecretKey,
  secretKeyPreview,
  envFallback,
  onChange,
}: CaptchaSettingsSectionProps) {
  const patch = (partial: Partial<CaptchaSettingsForm>) => onChange({ ...form, ...partial });
  const formsDisabled = !form.enabled;

  return (
    <div id="captcha" className="card p-6">
      <div className="mb-4 flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
        <div>
          <h2 className="text-h3 text-primary-dark">امنیت فرم‌ها و کپچا</h2>
          <p className="mt-1 text-small text-text-muted">
            محافظت فرم‌های عمومی، خبرنامه، درخواست عضویت و ورود ادمین. Google reCAPTCHA v3 مخفی؛ در صورت
            خطا، کپچای ریاضی جایگزین می‌شود.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ToggleRow
          checked={form.enabled}
          label="فعال‌سازی کپچا"
          hint="کلید reCAPTCHA v3 یا کپچای ریاضی برای فرم‌های انتخاب‌شده"
          onChange={(enabled) => patch({ enabled })}
        />

        <ToggleRow
          checked={form.honeypotEnabled}
          disabled={formsDisabled}
          label="فیلد مخفی ضد ربات (Honeypot)"
          hint="ربات‌هایی که فیلد website را پر کنند رد می‌شوند"
          onChange={(honeypotEnabled) => patch({ honeypotEnabled })}
        />

        <div className="lg:col-span-2 rounded-lg border border-border bg-surface-soft/40 p-4">
          <p className="mb-3 text-caption font-medium text-text">فرم‌های محافظت‌شده با کپچا</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <ToggleRow
              checked={form.protectNewsletter}
              disabled={formsDisabled}
              label="خبرنامه"
              onChange={(protectNewsletter) => patch({ protectNewsletter })}
            />
            <ToggleRow
              checked={form.protectLeads}
              disabled={formsDisabled}
              label="درخواست عضویت / لید"
              onChange={(protectLeads) => patch({ protectLeads })}
            />
            <ToggleRow
              checked={form.protectAdminLogin}
              disabled={formsDisabled}
              label="ورود پنل ادمین"
              onChange={(protectAdminLogin) => patch({ protectAdminLogin })}
            />
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="captcha-site-key">
            Site Key (reCAPTCHA v3)
          </label>
          <input
            id="captcha-site-key"
            value={form.siteKey}
            onChange={(e) => patch({ siteKey: e.target.value })}
            className="field-input"
            dir="ltr"
            placeholder="6Lc..."
            disabled={!form.enabled}
          />
          {envFallback.siteKey && !form.siteKey.trim() && (
            <p className="mt-1 text-caption text-text-muted">fallback از env: NEXT_PUBLIC_RECAPTCHA_SITE_KEY</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="captcha-secret-key">
            Secret Key (reCAPTCHA v3)
          </label>
          <input
            id="captcha-secret-key"
            type="password"
            value={form.secretKeyInput}
            onChange={(e) => patch({ secretKeyInput: e.target.value })}
            className="field-input"
            dir="ltr"
            placeholder={hasSecretKey ? 'برای تغییر، کلید جدید وارد کنید' : '6Lc...'}
            disabled={!form.enabled}
            autoComplete="new-password"
          />
          {hasSecretKey && !form.secretKeyInput && secretKeyPreview && (
            <p className="mt-1 text-caption text-success" dir="ltr">
              ذخیره‌شده: {secretKeyPreview}
            </p>
          )}
          {envFallback.secretKey && !hasSecretKey && !form.secretKeyInput.trim() && (
            <p className="mt-1 text-caption text-text-muted">fallback از env: RECAPTCHA_SECRET_KEY</p>
          )}
        </div>
      </div>

      {!form.enabled && (
        <p className="mt-4 rounded-lg bg-surface-soft px-3 py-2 text-caption text-text-muted">
          کپچا غیرفعال است — فرم‌ها بدون تأیید reCAPTCHA/ریاضی ارسال می‌شوند (Honeypot در صورت فعال بودن
          همچنان اعمال می‌شود).
        </p>
      )}
    </div>
  );
}

export { DEFAULT_CAPTCHA_FORM } from '@/lib/captcha/types';
