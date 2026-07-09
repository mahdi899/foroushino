'use client';

import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, KeyRound, Loader2, ShieldCheck, X } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { BaleIcon } from '@/components/icons/BaleIcon';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import {
  loginPasswordAction,
  sendOtpAction,
  sendOtpViaBaleAction,
  verifyOtpAction,
  type OtpAuthState,
} from '@/lib/student/actions';
import { getIranMobileInputError, isValidIranMobile, sanitizePhoneInput } from '@/lib/chatbot/phone';
import { cn } from '@/lib/cn';
import { OtpDigitInput } from './OtpDigitInput';

const OTP_INITIAL: OtpAuthState = { step: 'mobile' };
const RESEND_SECONDS = 60;

type Step = 'mobile' | 'otp' | 'password';

const fieldClass =
  'mt-1 h-11 w-full rounded-pill border border-bone/12 bg-ink/40 px-4 text-bone outline-none transition-[border-color,box-shadow] duration-200 placeholder:text-mist focus:border-emerald/45 focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-emerald-glow)_16%,transparent)]';

const btnPrimaryClass =
  'neon-btn-primary flex h-11 w-full items-center justify-center rounded-pill bg-emerald text-sm font-semibold text-bone transition hover:bg-emerald-glow disabled:cursor-not-allowed disabled:opacity-55';

function BaleSafirButton({
  mobile,
  disabled,
  onInfo,
  onError,
}: {
  mobile: string;
  disabled?: boolean;
  onInfo: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);

  async function handleSendViaBale() {
    if (pending || disabled || !mobile) return;
    setPending(true);
    onError('');

    const result = await sendOtpViaBaleAction(mobile);
    setPending(false);

    if (!result.ok) {
      onError(result.error);
      return;
    }

    onInfo(result.message);
  }

  return (
    <button
      type="button"
      onClick={() => void handleSendViaBale()}
      disabled={disabled || pending}
      className={cn(
        'flex w-full items-center justify-center gap-3 rounded-pill border border-[#2BBAE8]/25 bg-[#2BBAE8]/10 px-3 py-2.5 panel-text-meta font-medium text-bone transition',
        'hover:border-[#2BBAE8]/45 hover:bg-[#2BBAE8]/15 disabled:cursor-not-allowed disabled:opacity-55',
      )}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white shadow-sm ring-1 ring-[#2BBAE8]/15">
        {pending ? <Loader2 className="h-4 w-4 animate-spin text-[#2BBAE8]" /> : <BaleIcon className="h-5 w-5" />}
      </span>
      <span className="text-start leading-relaxed">
        {pending ? 'در حال ارسال از طریق سفیر بله…' : 'دریافت کد در پیام‌رسان بله'}
      </span>
    </button>
  );
}

export type StudentLoginFormProps = {
  redirectTo: string;
  variant?: 'modal' | 'page';
  active?: boolean;
  onClose?: () => void;
};

export function StudentLoginForm({
  redirectTo,
  variant = 'modal',
  active = true,
  onClose,
}: StudentLoginFormProps) {
  const [step, setStep] = useState<Step>('mobile');
  const [phone, setPhone] = useState('');
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [resendIn, setResendIn] = useState(0);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [baleError, setBaleError] = useState<string | null>(null);
  const [otpInfo, setOtpInfo] = useState<string | null>(null);
  const [passwordPending, startPasswordTransition] = useTransition();
  const verifyFormRef = useRef<HTMLFormElement>(null);
  const resendFormRef = useRef<HTMLFormElement>(null);
  const codeInputRef = useRef<HTMLInputElement>(null);
  const [otpState, sendOtp, sendPending] = useActionState(sendOtpAction, OTP_INITIAL);
  const [verifyState, verifyOtp, verifyPending] = useActionState(verifyOtpAction, OTP_INITIAL);
  const passwordSecurity = useFormSecurity('admin_login', { captchaStacked: true });

  const mobile = verifyState.mobile ?? otpState.mobile ?? phone;
  const phoneError = getIranMobileInputError(phone);
  const phoneValid = isValidIranMobile(phone);
  const showPhoneError = phoneError !== null && (phoneTouched || phone.length >= 2);
  const isPage = variant === 'page';

  const reset = useCallback(() => {
    setStep('mobile');
    setPhone('');
    setPhoneTouched(false);
    setOtpCode('');
    setResendIn(0);
    setPasswordError(null);
    setBaleError(null);
    setOtpInfo(null);
  }, []);

  useEffect(() => {
    if (active) return;
    const timer = window.setTimeout(() => reset(), 280);
    return () => window.clearTimeout(timer);
  }, [active, reset]);

  useEffect(() => {
    if (otpState.step === 'otp' && otpState.mobile) {
      setStep('otp');
      setResendIn(RESEND_SECONDS);
      if (otpState.info) setOtpInfo(otpState.info);
    }
  }, [otpState]);

  useEffect(() => {
    if (verifyState.step === 'otp' && verifyState.error) setOtpCode('');
  }, [verifyState]);

  useEffect(() => {
    if (!active || resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((prev) => (prev > 0 ? prev - 1 : 0)), 1000);
    return () => window.clearInterval(timer);
  }, [active, resendIn]);

  useEffect(() => {
    if (!active || isPage || !onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, isPage, onClose]);

  function handleOtpComplete(code: string) {
    setOtpCode(code);
    if (codeInputRef.current) codeInputRef.current.value = code;
    verifyFormRef.current?.requestSubmit();
  }

  function handleResend() {
    if (resendIn > 0 || sendPending) return;
    setBaleError(null);
    setOtpInfo(null);
    resendFormRef.current?.requestSubmit();
    setResendIn(RESEND_SECONDS);
    setOtpCode('');
  }

  function handlePasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordError(null);

    const fd = new FormData(e.currentTarget);
    const { captcha, website } = passwordSecurity.getSecurityPayload();

    if (passwordSecurity.captchaRequired && !captcha) {
      setPasswordError('لطفاً تأیید امنیتی را تکمیل کن.');
      return;
    }

    if (captcha?.captcha_token) fd.set('captcha_token', captcha.captcha_token);
    if (captcha?.captcha_id) fd.set('captcha_id', captcha.captcha_id);
    if (captcha?.captcha_answer !== undefined && captcha.captcha_answer !== null) {
      fd.set('captcha_answer', String(captcha.captcha_answer));
    }
    if (website) fd.set('website', website);

    startPasswordTransition(async () => {
      const result = await loginPasswordAction({}, fd);
      if (result.error) setPasswordError(result.error);
    });
  }

  return (
    <div
      role={isPage ? undefined : 'dialog'}
      aria-modal={isPage ? undefined : true}
      aria-labelledby="student-login-title"
      className={cn(
        'relative w-full overflow-hidden border border-bone/10 bg-charcoal/96',
        isPage
          ? 'max-w-md rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.45)]'
          : 'mx-auto w-full rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.55)]',
      )}
      dir="rtl"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-emerald-glow/40 to-transparent"
      />

      <div className="relative px-5 pb-4 pt-4">
        {!isPage && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute start-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-mist transition hover:bg-bone/6 hover:text-bone"
            aria-label="بستن"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        <div className="text-center">
          <BrandMark className="mx-auto h-9 w-9 rounded-pill ring-bone/12" />
          <h2 id="student-login-title" className="panel-text-body-lg mt-2.5 font-display font-semibold text-bone">
            ورود به پنل دانشجویی
          </h2>
          <p className="mt-0.5 flex items-center justify-center gap-1 panel-text-meta text-mist">
            <ShieldCheck className="h-3 w-3 text-emerald-glow/80" strokeWidth={1.5} aria-hidden />
            ورود امن با پیامک یا بله
          </p>
        </div>
      </div>

      <div className="border-t border-bone/6 px-5 py-4">
        <AnimatePresence mode="wait">
          {step === 'mobile' ? (
            <motion.form
              key="mobile"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              action={sendOtp}
              onSubmit={(e) => {
                setPhoneTouched(true);
                if (!phoneValid) e.preventDefault();
              }}
              className="space-y-3"
            >
              <label className="block">
                <span className="panel-text-meta font-medium text-mist">شماره موبایل</span>
                <input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  dir="ltr"
                  autoFocus
                  value={phone}
                  onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="09123456789"
                  maxLength={11}
                  className={cn(
                    fieldClass,
                    'text-center text-base font-semibold tracking-[0.1em]',
                    showPhoneError && 'border-gold/50',
                  )}
                  aria-invalid={showPhoneError}
                />
                {showPhoneError ? (
                  <p className="mt-1 panel-text-meta text-gold" role="alert">
                    {phoneError}
                  </p>
                ) : null}
              </label>

              {otpState.error ? <p className="panel-text-meta text-gold">{otpState.error}</p> : null}

              <button type="submit" disabled={!phoneValid || sendPending} className={btnPrimaryClass}>
                {sendPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'دریافت کد'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setStep('password');
                }}
                className="flex w-full items-center justify-center gap-1 py-0.5 panel-text-meta text-mist transition hover:text-emerald-glow"
              >
                <KeyRound className="h-3 w-3" />
                ورود با رمز عبور
              </button>
            </motion.form>
          ) : null}

          {step === 'otp' ? (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              className="space-y-3.5"
            >
              <form ref={resendFormRef} action={sendOtp} className="hidden" aria-hidden>
                <input type="hidden" name="mobile" value={mobile} />
              </form>

              <div className="flex items-center justify-between gap-2 rounded-pill border border-bone/8 bg-ink/25 px-3 py-2">
                <div className="min-w-0 text-start">
                  <p className="panel-text-caption text-mist">کد به</p>
                  <p className="truncate text-sm font-medium text-bone" dir="ltr">
                    {mobile}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('mobile');
                    setOtpCode('');
                  }}
                  className="inline-flex shrink-0 items-center gap-0.5 panel-text-meta text-emerald-glow transition hover:text-emerald"
                >
                  <ArrowRight className="h-3 w-3 rtl-flip" />
                  ویرایش
                </button>
              </div>

              <form ref={verifyFormRef} action={verifyOtp} className="space-y-3">
                <input type="hidden" name="mobile" value={mobile} />
                <input type="hidden" name="redirect_to" value={redirectTo} />
                <input ref={codeInputRef} type="hidden" name="code" value={otpCode} readOnly />

                <OtpDigitInput
                  value={otpCode}
                  onChange={(value) => {
                    setOtpCode(value);
                    if (codeInputRef.current) codeInputRef.current.value = value;
                  }}
                  onComplete={handleOtpComplete}
                  disabled={verifyPending}
                  error={Boolean(verifyState.error)}
                  autoFocus
                  compact
                />

                {verifyState.error ? (
                  <p className="text-center panel-text-meta text-gold" role="alert">
                    {verifyState.error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={otpCode.length < 5 || verifyPending}
                  className={btnPrimaryClass}
                >
                  {verifyPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'تأیید و ورود'}
                </button>
              </form>

              <BaleSafirButton
                mobile={mobile}
                disabled={verifyPending || sendPending}
                onInfo={(message) => {
                  setBaleError(null);
                  setOtpInfo(message);
                }}
                onError={(message) => setBaleError(message || null)}
              />

              {otpInfo ? <p className="text-center panel-text-meta text-mist">{otpInfo}</p> : null}

              {baleError ? (
                <p className="text-center panel-text-meta text-gold" role="alert">
                  {baleError}
                </p>
              ) : null}

              <p className="text-center panel-text-meta text-mist">
                {resendIn > 0 ? (
                  <>ارسال مجدد تا {resendIn.toLocaleString('fa-IR')} ثانیه</>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={sendPending}
                    className="font-medium text-emerald-glow transition hover:text-emerald"
                  >
                    {sendPending ? 'در حال ارسال…' : 'ارسال مجدد کد'}
                  </button>
                )}
              </p>
            </motion.div>
          ) : null}

          {step === 'password' ? (
            <motion.form
              key="password"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18 }}
              onSubmit={handlePasswordSubmit}
              className="space-y-3"
            >
              <input type="hidden" name="redirect_to" value={redirectTo} />
              {passwordSecurity.honeypotField}

              <label className="block">
                <span className="panel-text-meta font-medium text-mist">شماره موبایل</span>
                <input
                  name="mobile"
                  type="tel"
                  inputMode="numeric"
                  dir="ltr"
                  required
                  defaultValue={phone}
                  placeholder="09123456789"
                  maxLength={11}
                  className={cn(fieldClass, 'text-center tracking-[0.1em]')}
                />
              </label>

              <label className="block">
                <span className="panel-text-meta font-medium text-mist">رمز عبور</span>
                <input
                  name="password"
                  type="password"
                  required
                  className={fieldClass}
                  autoComplete="current-password"
                />
              </label>

              {passwordSecurity.captchaField}

              {passwordError ? <p className="panel-text-meta text-gold">{passwordError}</p> : null}

              <button
                type="submit"
                disabled={
                  passwordPending ||
                  passwordSecurity.securityLoading ||
                  (passwordSecurity.captchaRequired && !passwordSecurity.captchaReady)
                }
                className={btnPrimaryClass}
              >
                {passwordPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'ورود'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setStep('mobile');
                }}
                className="flex w-full items-center justify-center gap-1 py-0.5 panel-text-meta text-mist transition hover:text-emerald-glow"
              >
                ورود با کد یک‌بارمصرف
              </button>
            </motion.form>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
