'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, EyeOff, KeyRound, ShieldCheck, X } from 'lucide-react';
import { ProfilePasswordChangeSheet } from '@/components/student-panel/profile/ProfilePasswordChangeSheet';
import { cn } from '@/lib/cn';

type PasswordInputProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
  autoComplete: string;
  invalid?: boolean;
};

function PasswordInput({
  id,
  name,
  label,
  value,
  onChange,
  show,
  onToggleShow,
  autoComplete,
  invalid,
}: PasswordInputProps) {
  return (
    <div className="panel-profile-field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className="field-input-wrap field-input-wrap--password">
        <input
          id={id}
          name={name}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn('field-input', invalid && 'field-input--error')}
          autoComplete={autoComplete}
        />
        <button
          type="button"
          className="field-input-toggle"
          onClick={onToggleShow}
          aria-label={show ? 'مخفی کردن رمز عبور' : 'نمایش رمز عبور'}
          aria-pressed={show}
        >
          {show ? <EyeOff size={18} strokeWidth={2} /> : <Eye size={18} strokeWidth={2} />}
        </button>
      </div>
    </div>
  );
}

export function ProfilePasswordFields({
  hasPassword,
  mobile,
  onFieldChange,
}: {
  hasPassword: boolean;
  mobile: string;
  onFieldChange?: () => void;
}) {
  const router = useRouter();
  const checklistId = useId();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const active = password.length > 0;
  const minOk = password.length >= 6;
  const confirmationTouched = confirmation.length > 0;
  const matchOk = active && password === confirmation;

  if (hasPassword) {
    return (
      <>
        <div className="panel-profile-password-section panel-profile-password-section--settled">
          <div className="panel-profile-password-section__status">
            <span className="panel-profile-password-section__status-icon" aria-hidden>
              <ShieldCheck size={18} strokeWidth={2} />
            </span>
            <div className="panel-profile-password-section__status-copy">
              <p className="panel-profile-password-section__status-title">رمز عبور تنظیم شده</p>
              <p className="panel-profile-field__hint">
                برای تغییر رمز، ابتدا کد تأیید به شماره <span dir="ltr">{mobile}</span> ارسال می‌شود.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary panel-profile-password-section__change-btn"
            onClick={() => setSheetOpen(true)}
          >
            <KeyRound size={16} />
            تغییر رمز عبور
          </button>
        </div>

        <ProfilePasswordChangeSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          mobile={mobile}
          onSuccess={() => router.refresh()}
        />
      </>
    );
  }

  return (
    <div
      className={cn('panel-profile-password-section', active && 'panel-profile-password-section--active')}
      aria-live="polite"
    >
      <p className="panel-profile-password-section__lead">
        {active ? 'رمز جدید را تکمیل و تأیید کنید.' : 'می‌توانید یک رمز عبور برای ورود سریع‌تر تنظیم کنید.'}
      </p>

      <div className="panel-profile-grid panel-profile-grid--bundle-password">
        <PasswordInput
          id="password"
          name="password"
          label="رمز عبور جدید"
          value={password}
          onChange={(value) => {
            setPassword(value);
            onFieldChange?.();
          }}
          show={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          autoComplete="new-password"
        />
        <PasswordInput
          id="password_confirmation"
          name="password_confirmation"
          label="تکرار رمز عبور"
          value={confirmation}
          onChange={(value) => {
            setConfirmation(value);
            onFieldChange?.();
          }}
          show={showConfirmation}
          onToggleShow={() => setShowConfirmation((v) => !v)}
          autoComplete="new-password"
          invalid={active && confirmationTouched && !matchOk}
        />
      </div>

      {active ? (
        <ul id={checklistId} className="panel-profile-password-checklist" aria-label="شرایط رمز عبور">
          <li className={cn('panel-profile-password-checklist__item', minOk && 'panel-profile-password-checklist__item--ok')}>
            <span className="panel-profile-password-checklist__icon" aria-hidden>
              {minOk ? <Check size={14} /> : <X size={14} />}
            </span>
            حداقل ۶ کاراکتر
          </li>
          <li
            className={cn(
              'panel-profile-password-checklist__item',
              confirmationTouched && (matchOk ? 'panel-profile-password-checklist__item--ok' : 'panel-profile-password-checklist__item--err'),
            )}
          >
            <span className="panel-profile-password-checklist__icon" aria-hidden>
              {!confirmationTouched ? null : matchOk ? <Check size={14} /> : <X size={14} />}
            </span>
            تطابق با تکرار رمز
          </li>
        </ul>
      ) : (
        <p className="panel-profile-field__hint">حداقل ۶ کاراکتر؛ خالی بگذارید اگر نمی‌خواهید رمز را تغییر دهید.</p>
      )}
    </div>
  );
}
