'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Play, RefreshCw, XCircle } from 'lucide-react';
import {
  isRecaptchaConfigured,
  isTurnstileConfigured,
  PROVIDER_LOAD_TIMEOUT_MS,
  recaptchaScriptUrl,
  resolveRecaptchaSiteKey,
  resolveTurnstileSiteKey,
  turnstileScriptUrl,
} from '@/lib/captcha/config';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string;
          size?: 'normal' | 'compact' | 'invisible';
          theme?: 'light' | 'dark' | 'auto';
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      execute: (widgetId?: string) => void;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

type TestStatus = 'idle' | 'loading' | 'success' | 'error';

const recaptchaScriptPromises = new Map<string, Promise<void>>();
let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser-only'));
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = turnstileScriptUrl();
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed'));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser-only'));
  const key = siteKey.trim();
  if (!key) return Promise.reject(new Error('site key missing'));
  if (window.grecaptcha) return Promise.resolve();

  const cached = recaptchaScriptPromises.get(key);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = recaptchaScriptUrl(key);
    script.async = true;
    script.defer = true;
    script.dataset.recaptchaScript = key;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('reCAPTCHA script failed'));
    document.head.appendChild(script);
  });

  recaptchaScriptPromises.set(key, promise);
  return promise;
}

function StatusBadge({ status, message }: { status: TestStatus; message: string | null }) {
  if (status === 'idle') return null;

  const tone =
    status === 'loading'
      ? 'border-border bg-surface-soft text-text-muted'
      : status === 'success'
        ? 'border-success/30 bg-success/10 text-success'
        : 'border-error/30 bg-error/10 text-error';

  const Icon = status === 'loading' ? Loader2 : status === 'success' ? CheckCircle2 : XCircle;

  return (
    <p className={`mt-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-caption ${tone}`}>
      <Icon className={`h-4 w-4 shrink-0 ${status === 'loading' ? 'animate-spin' : ''}`} />
      <span>{message}</span>
    </p>
  );
}

function TurnstileTest({ siteKey }: { siteKey: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<string | null>(null);
  const [status, setStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const configured = isTurnstileConfigured(siteKey);

  const removeWidget = useCallback(() => {
    if (widgetRef.current && window.turnstile) {
      try {
        window.turnstile.remove(widgetRef.current);
      } catch {
        // ignore
      }
    }
    widgetRef.current = null;
  }, []);

  const mountWidget = useCallback(async () => {
    if (!configured || !containerRef.current) return;

    removeWidget();
    setStatus('loading');
    setMessage('در حال بارگذاری ویجت Turnstile...');

    try {
      await Promise.race([
        loadTurnstileScript(),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('timeout')), PROVIDER_LOAD_TIMEOUT_MS);
        }),
      ]);

      if (!window.turnstile || !containerRef.current) {
        throw new Error('Turnstile unavailable');
      }

      widgetRef.current = window.turnstile.render(containerRef.current, {
        sitekey: resolveTurnstileSiteKey(siteKey),
        size: 'normal',
        theme: 'auto',
        callback: () => {
          setStatus('success');
          setMessage('ویجت Turnstile بارگذاری شد و توکن دریافت شد — کلید Site Key معتبر است.');
        },
        'error-callback': () => {
          setStatus('error');
          setMessage('خطا در Turnstile — Site Key یا دامنه را در پنل Cloudflare بررسی کنید.');
        },
        'expired-callback': () => {
          setStatus('idle');
          setMessage('توکن منقضی شد — برای تست دوباره «بارگذاری مجدد» را بزنید.');
        },
      });

      setStatus('success');
      setMessage('ویجت Turnstile نمایش داده شد. اگر چک‌باکس را می‌بینید، Site Key و اسکریپت درست کار می‌کنند.');
    } catch {
      setStatus('error');
      setMessage('بارگذاری Turnstile ناموفق بود — Site Key یا اتصال اینترنت را بررسی کنید.');
    }
  }, [configured, removeWidget, siteKey]);

  useEffect(() => {
    if (!configured) {
      removeWidget();
      setStatus('idle');
      setMessage(null);
      return;
    }

    void mountWidget();
    return () => {
      removeWidget();
    };
  }, [configured, mountWidget, removeWidget]);

  if (!configured) {
    return (
      <p className="text-caption text-text-muted">
        Site Key وارد نشده — برای تست، کلید Turnstile را بالا وارد کنید یا از env استفاده کنید.
      </p>
    );
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-[65px]" />
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => void mountWidget()} className="btn btn-secondary px-3 py-1.5 text-caption">
          <RefreshCw className="h-3.5 w-3.5" />
          بارگذاری مجدد
        </button>
      </div>
      <StatusBadge status={status} message={message} />
    </div>
  );
}

function RecaptchaTest({ siteKey }: { siteKey: string }) {
  const [status, setStatus] = useState<TestStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const configured = isRecaptchaConfigured(siteKey);

  async function runTest() {
    if (!configured) return;

    setStatus('loading');
    setMessage('در حال بارگذاری اسکریپت reCAPTCHA v3...');

    try {
      const resolved = resolveRecaptchaSiteKey(siteKey);
      await Promise.race([
        loadRecaptchaScript(resolved),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('timeout')), PROVIDER_LOAD_TIMEOUT_MS);
        }),
      ]);

      await new Promise<void>((resolve) => {
        window.grecaptcha?.ready(() => resolve());
      });

      const token = await window.grecaptcha!.execute(resolved, { action: 'admin_test' });
      if (!token) throw new Error('empty token');

      setStatus('success');
      setMessage(`reCAPTCHA v3 کار می‌کند — توکن دریافت شد (${token.slice(0, 12)}…). تأیید سرور لازم نیست.`);
    } catch {
      setStatus('error');
      setMessage('تست reCAPTCHA ناموفق — Site Key، Secret Key یا دامنه را در کنسول Google بررسی کنید.');
    }
  }

  if (!configured) {
    return (
      <p className="text-caption text-text-muted">
        Site Key وارد نشده — برای تست، کلید reCAPTCHA v3 را بالا وارد کنید یا از env استفاده کنید.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-3 text-caption text-text-muted">
        reCAPTCHA v3 نامرئی است؛ با دکمه زیر اسکریپت بارگذاری و یک توکن آزمایشی گرفته می‌شود (بدون ارسال به سرور).
      </p>
      <button type="button" onClick={() => void runTest()} className="btn btn-secondary px-3 py-1.5 text-caption">
        {status === 'loading' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
        تست reCAPTCHA
      </button>
      <StatusBadge status={status} message={message} />
    </div>
  );
}

interface CaptchaProviderTestProps {
  turnstileSiteKey: string;
  recaptchaSiteKey: string;
}

export function CaptchaProviderTest({ turnstileSiteKey, recaptchaSiteKey }: CaptchaProviderTestProps) {
  return (
    <div className="lg:col-span-2 mt-2 space-y-4 rounded-lg border border-dashed border-border bg-surface-soft/30 p-4">
      <div>
        <p className="text-caption font-medium text-text">پیش‌نمایش و تست کپچا</p>
        <p className="mt-1 text-caption text-text-muted">
          فقط برای بررسی بصری — نیازی به ذخیره تنظیمات یا تأیید سرور نیست. کلیدهای واردشده در فرم (حتی قبل از ذخیره) استفاده
          می‌شوند.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-small font-medium text-primary-dark">تست Cloudflare Turnstile</p>
          <TurnstileTest siteKey={turnstileSiteKey} />
        </div>

        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="mb-3 text-small font-medium text-primary-dark">تست Google reCAPTCHA v3</p>
          <RecaptchaTest siteKey={recaptchaSiteKey} />
        </div>
      </div>
    </div>
  );
}
