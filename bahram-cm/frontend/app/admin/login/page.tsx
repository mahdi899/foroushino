'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/layout/Header';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { captchaField, honeypotField, captchaRequired, captchaReady, securityLoading, getSecurityPayload } =
    useFormSecurity('admin_login', { captchaAdmin: true });

  useEffect(() => {
    setMounted(true);
  }, []);

  const securityPending = mounted && (securityLoading || (captchaRequired && !captchaReady));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError('');

    const form = new FormData(e.currentTarget);
    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      setError('لطفاً تأیید امنیتی را تکمیل کن.');
      setPending(false);
      return;
    }

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password: form.get('password'),
        captcha_token: captcha?.captcha_token,
        captcha_id: captcha?.captcha_id,
        captcha_answer: captcha?.captcha_answer,
        website: website || undefined,
      }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error || 'ورود ناموفق بود.');
      setPending(false);
      return;
    }
    const from = String(form.get('from') || '/admin');
    router.push(from.startsWith('/admin') ? from : '/admin');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="admin-login-card relative">
      <input type="hidden" name="from" value={params.get('from') || '/admin'} />
      {honeypotField}

      <div className="mb-5 flex flex-col items-center gap-3 text-center sm:mb-6">
        <BrandMark className="h-10 w-10 sm:h-12 sm:w-12" />
        <div className="min-w-0">
          <h1 className="text-h3 text-text">پنل مدیریت بهرام</h1>
          <p className="mt-1 text-sm text-text-muted">برای ادامه وارد شوید</p>
        </div>
      </div>

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
            defaultValue="admin@bahram.local"
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
            defaultValue="password"
            dir="ltr"
            autoComplete="current-password"
          />
        </div>
      </div>

      {mounted && (captchaRequired || securityLoading) ? (
        <div className="admin-login-captcha-row mt-4 min-w-0 rounded-tile border border-border bg-surface-soft px-3 py-2.5 sm:px-4">
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

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

      <button
        type="submit"
        disabled={pending || securityPending}
        className="btn btn-primary mt-5 min-h-11 w-full sm:mt-6"
      >
        {pending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'ورود'}
      </button>

      <p className="mt-4 break-all text-center text-caption text-text-muted sm:break-normal">
        admin@bahram.local / password
      </p>
    </form>
  );
}

function LoginFormFallback() {
  return (
    <div className="admin-login-card flex min-h-[18rem] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
      <span className="sr-only">در حال بارگذاری…</span>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <div className="admin-login-screen">
      <div className="admin-login-screen__inner">
        <Suspense fallback={<LoginFormFallback />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
