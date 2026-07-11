'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/layout/Header';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';

type Props = {
  redirectFrom: string;
};

type Step = 'credentials' | 'otp';

const RESEND_SECONDS = 60;

export function AdminLoginForm({ redirectFrom }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [mobile, setMobile] = useState('');
  const [mobileMasked, setMobileMasked] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {
    captchaField,
    honeypotField,
    captchaRequired,
    captchaReady,
    securityLoading,
    getSecurityPayload,
    resetCaptcha,
  } = useFormSecurity('admin_login', { captchaAdmin: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  const securityPending = mounted && (securityLoading || (captchaRequired && !captchaReady));

  async function submitCredentials(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');
    setInfo('');

    const emailValue = email.trim();
    const passwordValue = password;

    if (!emailValue || !passwordValue) {
      setError('ایمیل و رمز عبور را وارد کنید.');
      setPending(false);
      return;
    }

    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      setError('پاسخ تأیید امنیتی را وارد کنید.');
      setPending(false);
      return;
    }

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailValue,
        password: passwordValue,
        captcha_token: captcha?.captcha_token,
        captcha_id: captcha?.captcha_id,
        captcha_answer: captcha?.captcha_answer,
        website: website || undefined,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = json.error || 'ایمیل یا رمز عبور نادرست است.';
      setError(message);
      if (/تأیید امنیتی|کپچا/i.test(message)) {
        resetCaptcha();
      }
      setPending(false);
      return;
    }

    if (!json.otp_required || !json.mobile) {
      setError('ورود ناموفق بود.');
      setPending(false);
      return;
    }

    setMobile(String(json.mobile));
    setMobileMasked(String(json.mobile_masked ?? json.mobile));
    setStep('otp');
    setCode('');
    setResendIn(RESEND_SECONDS);
    setInfo('کد تأیید به شماره موبایل ثبت‌شده در حساب شما پیامک شد.');
    setPending(false);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    setInfo('');

    if (!code.trim()) {
      setError('کد تأیید را وارد کنید.');
      setPending(false);
      return;
    }

    const res = await fetch('/api/admin/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, code: code.trim() }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'کد تأیید نامعتبر است.');
      setPending(false);
      return;
    }

    const from = redirectFrom.startsWith('/admin') ? redirectFrom : '/admin';
    router.push(from);
    router.refresh();
  }

  async function resendOtp() {
    if (resendIn > 0 || !mobile) return;
    setPending(true);
    setError('');
    setInfo('');

    const res = await fetch('/api/admin/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error || 'ارسال مجدد کد ناموفق بود.');
      setPending(false);
      return;
    }

    setResendIn(RESEND_SECONDS);
    setInfo('کد تأیید دوباره ارسال شد.');
    setPending(false);
  }

  function backToCredentials() {
    setStep('credentials');
    setCode('');
    setMobile('');
    setMobileMasked('');
    setError('');
    setInfo('');
  }

  return (
    <form
      onSubmit={step === 'credentials' ? submitCredentials : verifyOtp}
      className="admin-login-card relative"
    >
      {honeypotField}

      <div className="mb-5 flex flex-col items-center gap-3 text-center sm:mb-6">
        <BrandMark className="h-10 w-10 sm:h-12 sm:w-12" />
        <div className="min-w-0">
          <h1 className="text-h3 text-text">پنل مدیریت بهرام</h1>
          <p className="mt-1 text-sm text-text-muted">
            {step === 'credentials' ? 'برای ادامه وارد شوید' : 'کد تأیید پیامک‌شده را وارد کنید'}
          </p>
        </div>
      </div>

      {step === 'credentials' ? (
        <div className="space-y-4">
          <div className="min-w-0">
            <label className="field-label" htmlFor="email">
              ایمیل
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="field-input min-h-11 w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              autoComplete="username"
            />
          </div>
          <div className="min-w-0">
            <label className="field-label" htmlFor="password">
              رمز عبور
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="field-input min-h-11 w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              autoComplete="current-password"
            />
          </div>

          {mounted && (captchaRequired || securityLoading) ? (
            <div className="admin-login-captcha-row min-w-0 rounded-tile border border-border bg-surface-soft px-3 py-2.5 sm:px-4">
              <div className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-text-muted">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <span className="whitespace-nowrap">تأیید امنیتی</span>
              </div>
              <div className="admin-login-captcha min-w-0 flex-1">
                {securityLoading ? (
                  <p className="text-xs text-text-muted">در حال بارگذاری…</p>
                ) : (
                  captchaField
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-center text-sm text-text-muted">
            کد به شماره{' '}
            <span dir="ltr" className="font-medium text-text">
              {mobileMasked}
            </span>{' '}
            ارسال شد
          </p>

          <div className="min-w-0">
            <label className="field-label" htmlFor="code">
              کد تأیید
            </label>
            <input
              id="code"
              name="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              className="field-input min-h-11 w-full text-center text-lg tracking-[0.35em]"
              placeholder="•••••"
              dir="ltr"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={5}
              autoFocus
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <button
              type="button"
              onClick={backToCredentials}
              className="inline-flex items-center gap-1 text-text-muted hover:text-primary"
            >
              <ArrowRight className="h-4 w-4" />
              بازگشت
            </button>
            <button
              type="button"
              disabled={pending || resendIn > 0}
              onClick={() => void resendOtp()}
              className="text-text-muted hover:text-primary disabled:opacity-50"
            >
              {resendIn > 0 ? `ارسال مجدد (${resendIn})` : 'ارسال مجدد کد'}
            </button>
          </div>
        </div>
      )}

      {info ? <p className="mt-3 text-sm text-success">{info}</p> : null}
      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || (step === 'credentials' && securityPending) || (step === 'otp' && code.length < 5)}
        className="btn btn-primary mt-5 min-h-11 w-full sm:mt-6"
      >
        {pending ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : step === 'credentials' ? (
          'ادامه و دریافت کد'
        ) : (
          'ورود به پنل'
        )}
      </button>
    </form>
  );
}
