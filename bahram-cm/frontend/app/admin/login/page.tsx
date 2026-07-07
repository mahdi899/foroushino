'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/layout/Header';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const { captchaField, honeypotField, captchaRequired, captchaReady, securityLoading, getSecurityPayload } =
    useFormSecurity('admin_login');

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
    <form
      onSubmit={handleSubmit}
      className="relative w-full max-w-sm rounded-card border border-veil/30 bg-charcoal-2/80 p-8 shadow-veil backdrop-blur"
    >
      <input type="hidden" name="from" value={params.get('from') || '/admin'} />
      {honeypotField}

      <div className="mb-6 flex flex-col items-center gap-3 text-center">
        <BrandMark className="h-12 w-12" />
        <div>
          <h1 className="text-h3 text-bone">پنل مدیریت بهرام</h1>
          <p className="text-sm text-mist">برای ادامه وارد شوید</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-bone-dim" htmlFor="email">
            ایمیل
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-tile border border-veil/40 bg-ink px-3 py-2 text-bone"
            defaultValue="admin@bahram.local"
            dir="ltr"
            autoComplete="username"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-bone-dim" htmlFor="password">
            رمز عبور
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="w-full rounded-tile border border-veil/40 bg-ink px-3 py-2 text-bone"
            defaultValue="password"
            dir="ltr"
            autoComplete="current-password"
          />
        </div>
      </div>

      {captchaRequired ? (
        <div className="mt-4 rounded-tile border border-veil/25 bg-ink/50 px-3 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-mist">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-glow/80" aria-hidden />
            <span>تأیید امنیتی</span>
          </div>
          {captchaField}
        </div>
      ) : null}

      {error && <p className="mt-3 text-sm text-sales">{error}</p>}
      <button
        type="submit"
        disabled={pending || securityLoading || !captchaReady}
        className="mt-6 w-full rounded-pill bg-emerald px-4 py-3 font-semibold text-bone transition hover:bg-emerald-glow disabled:opacity-60"
      >
        {pending ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : 'ورود'}
      </button>
      <p className="mt-4 text-center text-caption text-mist">admin@bahram.local / password</p>
    </form>
  );
}

export default function AdminLogin() {
  return (
    <div className="admin-main-scroll grid h-full place-items-center bg-ink p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
