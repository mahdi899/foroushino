'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Phone } from 'lucide-react';

type Step = 'credentials' | 'otp';

const RESEND_SECONDS = 60;

export function SatLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [mobileMasked, setMobileMasked] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [resendIn]);

  async function submitCredentials(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');

    const res = await fetch('/api/sat/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(json.error || 'ورود ناموفق بود.');
      return;
    }

    setMobile(json.mobile);
    setMobileMasked(json.mobile_masked || json.mobile);
    setStep('otp');
    setResendIn(RESEND_SECONDS);
  }

  async function submitOtp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');

    const res = await fetch('/api/sat/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile, code: code.trim() }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);

    if (!res.ok) {
      setError(json.error || 'کد تأیید نامعتبر است.');
      return;
    }

    router.push('/sat');
    router.refresh();
  }

  async function resend() {
    if (resendIn > 0) return;
    setPending(true);
    setError('');
    const res = await fetch('/api/sat/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile }),
    });
    setPending(false);
    if (res.ok) setResendIn(RESEND_SECONDS);
    else {
      const json = await res.json().catch(() => ({}));
      setError(json.error || 'ارسال مجدد ممکن نیست.');
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-gold/20 bg-obsidian p-6 shadow-xl">
      <div className="mb-6 text-center">
        <p className="text-xs text-gold/80">سیستم عملیاتی فروش</p>
        <h1 className="mt-1 text-2xl font-semibold text-bone">ورود به پنل سات</h1>
        <p className="mt-2 text-sm text-bone/60">ثبت‌نام عمومی وجود ندارد — فقط پرسنل تعریف‌شده.</p>
      </div>

      {step === 'credentials' ? (
        <form onSubmit={submitCredentials} className="space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-bone/70">ایمیل</span>
            <input
              className="field-input w-full"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-bone/70">رمز عبور</span>
            <input
              className="field-input w-full"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'ادامه'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitOtp} className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border border-gold/15 bg-white/5 p-3 text-sm">
            <Phone className="h-4 w-4 text-gold" />
            <span>کد به {mobileMasked} ارسال شد</span>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-bone/70">کد تأیید</span>
            <input
              className="field-input w-full text-center tracking-[0.3em]"
              inputMode="numeric"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />
          </label>
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
          <button type="submit" disabled={pending} className="btn-primary w-full">
            {pending ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'ورود'}
          </button>
          <button type="button" onClick={resend} disabled={resendIn > 0 || pending} className="w-full text-sm text-bone/60 hover:text-bone">
            {resendIn > 0 ? `ارسال مجدد تا ${resendIn} ثانیه` : 'ارسال مجدد کد'}
          </button>
          <button type="button" onClick={() => setStep('credentials')} className="w-full text-sm text-bone/50 hover:text-bone">
            بازگشت
          </button>
        </form>
      )}
    </div>
  );
}
