'use client';

import { useActionState, useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, EyeOff, KeyRound, Loader2, X } from 'lucide-react';
import { OtpDigitInput } from '@/components/student-panel/auth/OtpDigitInput';
import { changePasswordAction, sendPasswordChangeOtpAction, type SimpleFormState } from '@/lib/student/panelActions';
import { cn } from '@/lib/cn';

const INITIAL: SimpleFormState = {};
const RESEND_SECONDS = 60;

type PasswordInputProps = {
  id: string;
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  show: boolean;
  onToggleShow: () => void;
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
          autoComplete="new-password"
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

type Props = {
  open: boolean;
  onClose: () => void;
  mobile: string;
  onSuccess: () => void;
};

export function ProfilePasswordChangeSheet({ open, onClose, mobile, onSuccess }: Props) {
  const formId = useId();
  const checklistId = useId();
  const [mounted, setMounted] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [state, submit, pending] = useActionState(changePasswordAction, INITIAL);

  const minOk = password.length >= 6;
  const confirmationTouched = confirmation.length > 0;
  const matchOk = password.length > 0 && password === confirmation;
  const otpReady = otpCode.length === 5;
  const canSubmit = otpReady && minOk && matchOk && !pending;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setOtpCode('');
    setPassword('');
    setConfirmation('');
    setShowPassword(false);
    setShowConfirmation(false);
    setOtpError(null);
    void sendOtp();
  }, [open]);

  useEffect(() => {
    if (!open || resendIn <= 0) return;
    const timer = window.setInterval(() => {
      setResendIn((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, resendIn]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending && !sendingOtp) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, pending, sendingOtp]);

  useEffect(() => {
    if (!state.success || !open) return;
    onSuccess();
    onClose();
  }, [state.success, open, onClose, onSuccess]);

  async function sendOtp() {
    setSendingOtp(true);
    setOtpError(null);
    const result = await sendPasswordChangeOtpAction();
    setSendingOtp(false);
    if (result.error) {
      setOtpError(result.error);
      return;
    }
    setResendIn(RESEND_SECONDS);
  }

  function handleClose() {
    if (pending || sendingOtp) return;
    onClose();
  }

  if (!mounted || !open) return null;

  const portalTarget = document.getElementById('panel-root') ?? document.body;

  return createPortal(
    <>
      <div className="panel-academy-sheet__scrim" onClick={handleClose} aria-hidden />
      <div
        className="panel-academy-sheet panel-academy-sheet--password"
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-password-sheet-title"
      >
        <div className="panel-academy-sheet__banner">
          <div className="panel-academy-sheet__banner-glow" aria-hidden />
          <div className="panel-academy-sheet__handle" aria-hidden />
          <button
            type="button"
            className="panel-academy-sheet__close"
            onClick={handleClose}
            disabled={pending || sendingOtp}
            aria-label="بستن"
          >
            <X size={18} />
          </button>

          <div className="panel-academy-sheet__banner-main">
            <div className="panel-academy-sheet__icon" aria-hidden>
              <span className="panel-academy-sheet__icon-ring">
                <KeyRound size={28} strokeWidth={2} />
              </span>
            </div>

            <div className="panel-academy-sheet__intro">
              <h3 id="panel-password-sheet-title" className="panel-academy-sheet__title">
                تغییر رمز عبور
              </h3>
              <p className="panel-academy-sheet__hint">
                کد به <span dir="ltr">{mobile}</span>
              </p>
            </div>
          </div>
        </div>

        <div className="panel-academy-sheet__content panel-password-sheet__content">
          {otpError ? <p className="text-sm text-error">{otpError}</p> : null}
          {state.error ? <p className="text-sm text-error">{state.error}</p> : null}

          <form id={formId} action={submit} className="panel-password-sheet__form">
            <input type="hidden" name="code" value={otpCode} />

            <div className="panel-password-sheet__otp">
              <OtpDigitInput
                value={otpCode}
                onChange={setOtpCode}
                disabled={pending || sendingOtp}
                error={Boolean(state.error && !otpReady)}
                autoFocus
                compact
                theme="panel"
              />
              <div className="panel-password-sheet__resend">
                {resendIn > 0 ? (
                  <span className="panel-profile-field__hint">{resendIn.toLocaleString('fa-IR')} ثانیه</span>
                ) : (
                  <button
                    type="button"
                    className="panel-password-sheet__resend-btn"
                    onClick={() => void sendOtp()}
                    disabled={sendingOtp || pending}
                  >
                    {sendingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ارسال مجدد'}
                  </button>
                )}
              </div>
            </div>

            <PasswordInput
              id="sheet_password"
              name="password"
              label="رمز عبور جدید"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onToggleShow={() => setShowPassword((v) => !v)}
            />
            <PasswordInput
              id="sheet_password_confirmation"
              name="password_confirmation"
              label="تکرار رمز عبور"
              value={confirmation}
              onChange={setConfirmation}
              show={showConfirmation}
              onToggleShow={() => setShowConfirmation((v) => !v)}
              invalid={password.length > 0 && confirmationTouched && !matchOk}
            />

            {password.length > 0 ? (
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
            ) : null}
          </form>

          <div className="panel-academy-sheet__actions">
            <button
              type="submit"
              form={formId}
              className="panel-academy-sheet__cta"
              disabled={!canSubmit}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ذخیره رمز جدید'}
            </button>
            <button type="button" className="panel-academy-sheet__dismiss" onClick={handleClose} disabled={pending || sendingOtp}>
              انصراف
            </button>
          </div>
        </div>
      </div>
    </>,
    portalTarget,
  );
}
