'use client';

import { ArrowLeft, CheckCircle2, Loader2, MapPin, Phone, ShieldCheck, User2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useId, useRef, useState } from 'react';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import { LoggedInUserSummary } from '@/components/forms/LoggedInUserSummary';
import { OtpDigitInput } from '@/components/student-panel/auth/OtpDigitInput';
import { useStudentAuthOptional, useStudentFormPrefill } from '@/components/student-panel/auth/StudentAuthContext';
import { cn } from '@/lib/cn';
import { getIranMobileInputError, isValidIranMobile, normalizeIranMobile, sanitizePhoneInput } from '@/lib/chatbot/phone';
import { captchaToRequestFields } from '@/lib/captcha/types';
import { sendSatApplyOtpAction, verifySatApplyOtpInlineAction } from '@/lib/student/actions';
import { submitSatApplicationAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';

const DRAFT_KEY = 'saat-apply-draft';
const INITIAL: SimpleFormState = {};
const OTP_RESEND_SECONDS = 60;

type Draft = {
  firstName: string;
  lastName: string;
  phone: string;
  city: string;
  age: string;
};

export type SatPublicApplicationStatus = {
  status: string;
  statusLabel: string;
  submittedAt: string | null;
};

const inputClass =
  'mt-2 block w-full rounded-tile border border-bone/12 bg-ink/60 px-4 py-3 text-sm text-bone placeholder:text-mist focus:border-gold/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/30';

function readDraft(): Draft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Draft> & { name?: string };
    const legacyName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
    const firstName =
      typeof parsed.firstName === 'string' ? parsed.firstName : legacyName.split(/\s+/)[0] ?? '';
    const lastName =
      typeof parsed.lastName === 'string'
        ? parsed.lastName
        : legacyName.split(/\s+/).slice(1).join(' ');

    return {
      firstName,
      lastName,
      phone: typeof parsed.phone === 'string' ? parsed.phone : '',
      city: typeof parsed.city === 'string' ? parsed.city : '',
      age: typeof parsed.age === 'string' ? parsed.age : '',
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: Draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

function clearDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

export function SatPublicApplicationForm({
  application,
  className,
}: {
  application?: SatPublicApplicationStatus | null;
  className?: string;
}) {
  const formId = useId();
  const router = useRouter();
  const auth = useStudentAuthOptional();
  const prefill = useStudentFormPrefill();
  const isLoggedIn = Boolean(auth?.isLoggedIn || prefill);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(isLoggedIn);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpPending, setOtpPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const restoredRef = useRef(false);
  const [state, action, pending] = useActionState(submitSatApplicationAction, INITIAL);

  const {
    captchaField,
    honeypotField,
    captchaRequired,
    captchaReady,
    securityLoading,
    getSecurityPayload,
    resetCaptcha,
  } = useFormSecurity('leads', { captchaInline: false });

  const resolvedPhone = prefill?.phone || phone;
  const phoneError = getIranMobileInputError(phone);
  const phoneValid = isValidIranMobile(phone);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = readDraft();
    if (draft) {
      setFirstName(draft.firstName);
      setLastName(draft.lastName);
      setPhone(draft.phone);
      setCity(draft.city);
      setAge(draft.age);
      return;
    }
    if (prefill?.firstName) setFirstName(prefill.firstName);
    if (prefill?.lastName) setLastName(prefill.lastName);
    if (prefill?.phone) setPhone(prefill.phone);
  }, [prefill?.firstName, prefill?.lastName, prefill?.phone]);

  useEffect(() => {
    setPhoneVerified(isLoggedIn);
  }, [isLoggedIn]);

  useEffect(() => {
    if (state.success) clearDraft();
  }, [state.success]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  useEffect(() => {
    if (state.error && /تأیید امنیتی|کپچا/i.test(state.error)) {
      resetCaptcha();
    }
  }, [state.error, resetCaptcha]);

  if (application) {
    return (
      <div
        className={cn(
          'neon-surface-static rounded-card-lg border border-gold/25 bg-charcoal/55 p-5 md:p-7',
          className,
        )}
      >
        <p className="text-caption uppercase tracking-[0.2em] text-gold">وضعیت درخواست</p>
        <p className="mt-3 font-display text-lg text-bone">{application.statusLabel}</p>
        {application.submittedAt ? (
          <p className="mt-2 text-sm text-bone-dim">
            ثبت‌شده در{' '}
            <span className="num-latin">
              {new Date(application.submittedAt).toLocaleDateString('fa-IR')}
            </span>
          </p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-bone-dim">
          جزئیات و پیگیری را در{' '}
          <a href="/panel/sat" className="text-gold underline-offset-2 hover:underline">
            پنل کاربری › سات
          </a>{' '}
          ببین.
        </p>
      </div>
    );
  }

  if (state.success) {
    return (
      <div
        className={cn(
          'neon-surface-static rounded-card-lg border border-gold/25 bg-charcoal/55 p-5 md:p-7',
          className,
        )}
        role="status"
      >
        <p className="font-display text-lg text-bone">درخواستت ثبت شد</p>
        <p className="mt-2 text-sm leading-relaxed text-bone-dim">
          تیم ما درخواست را بررسی می‌کند. وضعیت را از{' '}
          <a href="/panel/sat" className="text-gold underline-offset-2 hover:underline">
            پنل سات
          </a>{' '}
          هم می‌توانی دنبال کنی.
        </p>
      </div>
    );
  }

  const persistDraft = () => {
    writeDraft({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      age: age.trim(),
    });
  };

  const handleSendOtp = async () => {
    setOtpError(null);
    setFieldError(null);
    if (!phoneValid) {
      setOtpError(phoneError ?? 'شماره موبایل معتبر نیست.');
      return;
    }

    setOtpPending(true);
    const result = await sendSatApplyOtpAction(normalizeIranMobile(phone));
    setOtpPending(false);

    if (!result.ok) {
      setOtpError(result.error);
      return;
    }

    persistDraft();
    setOtpSent(true);
    setOtpCode('');
    setOtpInfo(result.info);
    setResendIn(OTP_RESEND_SECONDS);
  };

  const handleVerifyOtp = async () => {
    setOtpError(null);
    setFieldError(null);
    if (!otpCode.trim()) {
      setOtpError('کد تایید را وارد کنید.');
      return;
    }

    setOtpPending(true);
    const result = await verifySatApplyOtpInlineAction(normalizeIranMobile(phone), otpCode.trim());
    setOtpPending(false);

    if (!result.ok) {
      setOtpError(result.error);
      setOtpCode('');
      return;
    }

    setPhoneVerified(true);
    setOtpSent(false);
    setOtpInfo(null);
    auth?.markLoggedIn(undefined, {
      name: [firstName, lastName].filter(Boolean).join(' ') || 'کاربر',
      firstName,
      lastName,
      phone: normalizeIranMobile(phone),
      email: '',
    });
    router.refresh();
  };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setFieldError(null);

    if (!firstName.trim()) {
      event.preventDefault();
      setFieldError('نام را وارد کنید.');
      return;
    }
    if (!lastName.trim()) {
      event.preventDefault();
      setFieldError('نام خانوادگی را وارد کنید.');
      return;
    }
    if (!phoneVerified) {
      event.preventDefault();
      setFieldError('ابتدا شماره موبایل را تایید کنید.');
      return;
    }

    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      event.preventDefault();
      setFieldError('لطفاً تأیید امنیتی را تکمیل کن.');
      return;
    }

    persistDraft();

    const form = event.currentTarget;
    const setHidden = (name: string, value: string) => {
      let input = form.querySelector<HTMLInputElement>(`input[name="${name}"]`);
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = value;
    };

    const captchaFields = captchaToRequestFields(captcha);
    for (const [key, value] of Object.entries(captchaFields)) {
      if (value !== undefined && value !== null) {
        setHidden(key, String(value));
      }
    }
    if (website !== undefined) {
      setHidden('website', website);
    }
  };

  const feedback = fieldError || otpError || state.error;

  return (
    <form
      action={action}
      onSubmit={onSubmit}
      className={cn(
        'neon-surface-static relative rounded-card-lg border border-gold/22 bg-charcoal/55 p-5 md:p-7',
        className,
      )}
      noValidate
    >
      {honeypotField}

      <div className="space-y-4">
        {prefill && phoneVerified ? (
          <LoggedInUserSummary prefill={prefill} className="border-gold/15 [&_svg]:text-gold" />
        ) : (
          <p className="rounded-tile border border-gold/18 bg-gold/[0.06] px-3 py-2.5 text-sm leading-relaxed text-bone-dim">
            برای ثبت درخواست، شماره موبایل را تایید کن و اطلاعات را کامل پر کن.
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${formId}-first-name`} className="block min-w-0">
            <span className="block text-caption text-bone">نام *</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-first-name`}
                name="first_name"
                type="text"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                  setFieldError(null);
                }}
                disabled={pending}
                className={cn(inputClass, 'ps-10')}
              />
            </div>
          </label>

          <label htmlFor={`${formId}-last-name`} className="block min-w-0">
            <span className="block text-caption text-bone">نام خانوادگی *</span>
            <input
              id={`${formId}-last-name`}
              name="last_name"
              type="text"
              autoComplete="family-name"
              required
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                setFieldError(null);
              }}
              disabled={pending}
              className={inputClass}
            />
          </label>
        </div>

        <div className="rounded-tile border border-bone/10 bg-ink/35 p-3.5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-caption text-bone">شماره موبایل *</span>
            {phoneVerified ? (
              <span className="inline-flex items-center gap-1.5 text-caption text-emerald-glow">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                تایید شده
              </span>
            ) : null}
          </div>

          {phoneVerified ? (
            <p className="mt-2 text-sm text-bone num-latin" dir="ltr">
              {resolvedPhone}
            </p>
          ) : (
            <>
              <div className="relative mt-2">
                <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                  <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
                </span>
                <input
                  id={`${formId}-phone`}
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  dir="ltr"
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizePhoneInput(e.target.value));
                    setOtpError(null);
                    setFieldError(null);
                  }}
                  disabled={pending || otpPending || otpSent}
                  placeholder="09xxxxxxxxx"
                  className={cn(inputClass, 'ps-10 num-latin', phoneError && phone.length >= 2 && 'border-gold/60')}
                />
              </div>

              {!otpSent ? (
                <button
                  type="button"
                  onClick={() => void handleSendOtp()}
                  disabled={pending || otpPending || !phoneValid}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-pill border border-emerald/30 bg-emerald/10 px-4 text-sm font-medium text-bone transition hover:border-emerald/45 hover:bg-emerald/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {otpPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4" aria-hidden />}
                  ارسال کد تایید
                </button>
              ) : (
                <div className="mt-3 space-y-3">
                  {otpInfo ? <p className="text-caption text-bone-dim">{otpInfo}</p> : null}
                  <OtpDigitInput
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={otpPending}
                    error={Boolean(otpError)}
                    autoFocus
                    compact
                    theme="login"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleVerifyOtp()}
                      disabled={otpPending || otpCode.trim().length < 5}
                      className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-pill bg-emerald px-4 text-sm font-semibold text-bone transition hover:bg-emerald-glow disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {otpPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                      تایید شماره
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSendOtp()}
                      disabled={otpPending || resendIn > 0}
                      className="inline-flex h-10 items-center justify-center rounded-pill border border-bone/15 px-4 text-sm text-bone-dim transition hover:border-bone/25 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {resendIn > 0 ? `ارسال مجدد (${resendIn})` : 'ارسال مجدد'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label htmlFor={`${formId}-city`} className="block min-w-0">
            <span className="block text-caption text-bone">شهر</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
                <MapPin className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </span>
              <input
                id={`${formId}-city`}
                name="city"
                type="text"
                autoComplete="address-level2"
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  setFieldError(null);
                }}
                disabled={pending}
                className={cn(inputClass, 'ps-10')}
              />
            </div>
          </label>

          <label htmlFor={`${formId}-age`} className="block min-w-0">
            <span className="block text-caption text-bone">سن</span>
            <input
              id={`${formId}-age`}
              name="age"
              type="number"
              min={10}
              max={120}
              inputMode="numeric"
              value={age}
              onChange={(e) => {
                setAge(e.target.value);
                setFieldError(null);
              }}
              disabled={pending}
              className={cn(inputClass, 'num-latin')}
            />
          </label>
        </div>

        {captchaField}

        <button
          type="submit"
          disabled={pending || securityLoading || !captchaReady || !phoneVerified}
          aria-busy={pending}
          className="group neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-gold px-6 text-sm font-semibold text-ink transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-gold-soft hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <span>ثبت درخواست سات</span>
              <ArrowLeft
                className="rtl-flip h-4 w-4 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </button>

        <p
          role="status"
          aria-live="polite"
          className={cn(
            'text-center text-caption transition-opacity',
            !feedback && 'hidden',
            feedback && 'text-gold',
          )}
        >
          {feedback}
        </p>

        <p className="text-center text-caption text-mist">
          اطلاعات فقط برای بررسی درخواست استفاده می‌شود.
        </p>
      </div>
    </form>
  );
}
