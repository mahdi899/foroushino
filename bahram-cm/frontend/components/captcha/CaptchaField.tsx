'use client';

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { fetchMathCaptcha, fetchCaptchaPublicConfig } from '@/lib/captcha/api';
import {
  isRecaptchaConfigured,
  recaptchaScriptUrl,
  RECAPTCHA_LOAD_TIMEOUT_MS,
  RECAPTCHA_TOKEN_REFRESH_MS,
  resolveRecaptchaSiteKey,
} from '@/lib/captcha/config';
import type { CaptchaMode, CaptchaPayload, CaptchaPublicConfig } from '@/lib/captcha/types';
import { sanitizeNumericInput, isNumericInputKey } from '@/lib/captcha/numericInput';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const recaptchaScriptPromises = new Map<string, Promise<void>>();

function loadRecaptchaScript(siteKey: string): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('reCAPTCHA is browser-only'));
  }

  const key = siteKey.trim();
  if (!key) {
    return Promise.reject(new Error('reCAPTCHA site key missing'));
  }

  if (window.grecaptcha) {
    return Promise.resolve();
  }

  const cached = recaptchaScriptPromises.get(key);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const url = recaptchaScriptUrl(key);
    const existing = document.querySelector<HTMLScriptElement>(`script[data-recaptcha-script="${key}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('reCAPTCHA script failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = url;
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

export interface CaptchaFieldProps {
  className?: string;
  siteKey?: string;
  compact?: boolean;
  /** Extra-compact math captcha for inline newsletter/forms */
  tight?: boolean;
  /** Embedded inside site newsletter pill — math-only, no extra box/label */
  pillEmbed?: boolean;
  /** When false, widget init (and /api/captcha/*) is deferred until true. */
  active?: boolean;
  /** Single-row layout for chatbot footer */
  inline?: boolean;
  /** Matches site footer/newsletter pill forms (charcoal + bone) */
  variant?: 'default' | 'site' | 'admin';
  onReadyChange?: (ready: boolean) => void;
  onPayloadChange?: (payload: CaptchaPayload | null) => void;
  /** reCAPTCHA v3 token obtained — verify on server before unlocking chat. */
  onHumanVerified?: (payload: CaptchaPayload) => void;
  /** Enter pressed in math answer field (chatbot verify step). */
  onMathSubmit?: (payload: CaptchaPayload) => void;
}

export interface CaptchaFieldHandle {
  getPayload: () => CaptchaPayload | null;
}

export const CaptchaField = forwardRef<CaptchaFieldHandle, CaptchaFieldProps>(function CaptchaField(
  {
    className,
    siteKey = '',
    compact,
    tight,
    pillEmbed,
    inline,
    variant = 'default',
    active = true,
    onReadyChange,
    onPayloadChange,
    onHumanVerified,
    onMathSubmit,
  },
  ref,
) {
  const payloadRef = useRef<CaptchaPayload | null>(null);
  const mathAnswerRef = useRef('');
  const mathIdRef = useRef('');
  const modeRef = useRef<CaptchaMode>('loading');
  const refreshTimerRef = useRef<number | null>(null);
  const recaptchaGenRef = useRef(0);
  const answerInputId = useId();
  const recaptchaSiteKey = variant === 'admin' ? siteKey.trim() : resolveRecaptchaSiteKey(siteKey);

  const [mode, setMode] = useState<CaptchaMode>('loading');
  const [mathQuestion, setMathQuestion] = useState('');
  const [mathId, setMathId] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathLoading, setMathLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  mathAnswerRef.current = mathAnswer;
  mathIdRef.current = mathId;
  modeRef.current = mode;

  useImperativeHandle(
    ref,
    () => ({
      getPayload: (): CaptchaPayload | null => {
        if (modeRef.current === 'math') {
          const trimmed = mathAnswerRef.current.trim();
          if (mathIdRef.current && trimmed) {
            return { captcha_id: mathIdRef.current, captcha_answer: trimmed };
          }
          return null;
        }
        return payloadRef.current;
      },
    }),
    [],
  );

  const notifyPayload = useCallback(
    (payload: CaptchaPayload | null) => {
      payloadRef.current = payload;
      onPayloadChange?.(payload);
    },
    [onPayloadChange],
  );

  const notifyReady = useCallback(
    (ready: boolean) => {
      onReadyChange?.(ready);
    },
    [onReadyChange],
  );

  const syncMathPayload = useCallback(
    (id: string, answer: string) => {
      const trimmed = answer.trim();
      if (id && trimmed) {
        notifyReady(true);
        notifyPayload({ captcha_id: id, captcha_answer: trimmed });
        return;
      }
      notifyReady(false);
      notifyPayload(null);
    },
    [notifyPayload, notifyReady],
  );

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current !== null) {
      window.clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const mathFetchGenRef = useRef(0);

  const activateMathMode = useCallback(async () => {
    clearRefreshTimer();
    const gen = ++mathFetchGenRef.current;
    setMode('math');
    setMathAnswer('');
    setLoadError(null);
    notifyReady(false);
    notifyPayload(null);

    setMathLoading(true);
    try {
      const challenge = await fetchMathCaptcha();
      if (gen !== mathFetchGenRef.current) return;
      setMathId(challenge.id);
      setMathQuestion(challenge.question);
      setLoadError(null);
    } catch {
      if (gen !== mathFetchGenRef.current) return;
      setLoadError('بارگذاری کپچا ناموفق بود. «سؤال جدید» را بزنید یا صفحه را رفرش کنید.');
      setMathQuestion('');
      setMathId('');
    } finally {
      if (gen === mathFetchGenRef.current) setMathLoading(false);
    }
  }, [clearRefreshTimer, notifyPayload, notifyReady]);

  const executeRecaptcha = useCallback(async () => {
    if (!window.grecaptcha) {
      throw new Error('reCAPTCHA unavailable');
    }

    const token = await window.grecaptcha.execute(recaptchaSiteKey, { action: 'submit' });
    if (!token) {
      throw new Error('reCAPTCHA token empty');
    }

    setMode('recaptcha');
    setLoadError(null);
    notifyReady(true);
    const payload = { captcha_token: token };
    notifyPayload(payload);
    onHumanVerified?.(payload);
  }, [notifyPayload, notifyReady, onHumanVerified, recaptchaSiteKey]);

  const startRecaptcha = useCallback(async () => {
    if (!isRecaptchaConfigured(recaptchaSiteKey)) {
      await activateMathMode();
      return;
    }

    const gen = ++recaptchaGenRef.current;
    setMode('loading');
    setLoadError(null);
    notifyReady(false);
    notifyPayload(null);
    clearRefreshTimer();

    try {
      await Promise.race([
        loadRecaptchaScript(recaptchaSiteKey),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('reCAPTCHA timeout')), RECAPTCHA_LOAD_TIMEOUT_MS);
        }),
      ]);

      if (gen !== recaptchaGenRef.current) return;

      await new Promise<void>((resolve) => {
        window.grecaptcha?.ready(() => resolve());
      });

      if (gen !== recaptchaGenRef.current) return;

      await executeRecaptcha();

      if (gen !== recaptchaGenRef.current) return;

      refreshTimerRef.current = window.setInterval(() => {
        void executeRecaptcha().catch(() => {
          clearRefreshTimer();
          notifyReady(false);
          notifyPayload(null);
        });
      }, RECAPTCHA_TOKEN_REFRESH_MS);
    } catch {
      if (gen !== recaptchaGenRef.current) return;
      await activateMathMode();
    }
  }, [activateMathMode, clearRefreshTimer, executeRecaptcha, notifyPayload, notifyReady, recaptchaSiteKey]);

  const startRecaptchaRef = useRef(startRecaptcha);
  startRecaptchaRef.current = startRecaptcha;

  useEffect(() => {
    if (!active) return;
    void startRecaptchaRef.current();
    return () => {
      clearRefreshTimer();
      recaptchaGenRef.current += 1;
    };
  }, [active, clearRefreshTimer]);

  useEffect(() => {
    if (mode !== 'math') return;
    syncMathPayload(mathId, mathAnswer);
  }, [mathAnswer, mathId, mode, syncMathPayload]);

  async function refreshMathChallenge() {
    const gen = ++mathFetchGenRef.current;
    setMathAnswer('');
    notifyReady(false);
    notifyPayload(null);
    setMathLoading(true);
    setLoadError(null);

    try {
      const challenge = await fetchMathCaptcha();
      if (gen !== mathFetchGenRef.current) return;
      setMathId(challenge.id);
      setMathQuestion(challenge.question);
    } catch {
      if (gen !== mathFetchGenRef.current) return;
      setLoadError('بارگذاری کپچا ناموفق بود. لطفاً دوباره تلاش کنید.');
    } finally {
      if (gen === mathFetchGenRef.current) setMathLoading(false);
    }
  }

  const adminInline = variant === 'admin' && inline;
  const siteInline =
    variant === 'site' || (!adminInline && variant !== 'default' && compact && inline);
  const siteTight = siteInline && tight;
  const mathOnly = mode === 'math' && (pillEmbed || (compact && inline));
  const invisibleRecaptcha = mode === 'recaptcha' || (mode === 'loading' && isRecaptchaConfigured(recaptchaSiteKey) && !mathOnly);

  return (
    <div
      className={cn(
        pillEmbed
          ? 'inline-flex shrink-0 items-center'
          : siteInline
            ? 'relative z-10 w-full min-w-0'
            : compact && inline
              ? 'relative z-10'
              : compact
                ? 'space-y-3'
                : 'rounded-lg border border-border bg-surface-soft/40 p-4',
        className,
      )}
      aria-label={pillEmbed ? 'تأیید امنیتی' : undefined}
    >
      {mode === 'loading' && !mathOnly && invisibleRecaptcha && (
        <div className={cn('flex items-center gap-2 text-text-muted', compact && inline ? 'text-[11px]' : 'text-small')}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {compact && inline ? '…' : 'در حال تأیید امنیتی...'}
        </div>
      )}

      {mode === 'loading' && mathOnly && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-mist" aria-hidden />
      )}

      {mode === 'math' && (
        <div
          data-captcha-math
          className={cn(
            'relative z-20 flex w-full min-w-0 flex-nowrap items-center gap-1.5',
            siteInline ? 'max-w-full' : inline ? 'text-[12px]' : 'w-full text-small',
          )}
          dir="ltr"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              'captcha-math-question shrink-0 whitespace-nowrap font-semibold tabular-nums',
              siteTight
                ? pillEmbed
                  ? 'px-0.5 text-[10px] text-bone-dim'
                  : 'rounded-pill border border-bone/18 bg-charcoal-2 px-2 py-0.5 text-[10px] text-bone'
                : siteInline
                  ? 'rounded-pill border border-bone/18 bg-charcoal-2 px-2.5 py-1 text-xs text-bone'
                  : adminInline
                    ? 'rounded-full border border-border bg-primary-soft px-3 py-1.5 text-center text-[13px] text-primary-dark'
                    : inline
                      ? 'rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-center text-[13px] text-emerald-deep shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md'
                      : 'rounded-md border border-bone/15 bg-charcoal-2 px-3 py-1.5 text-bone',
            )}
            dir="ltr"
            title={mathLoading ? undefined : `${mathQuestion} = ?`}
          >
            {mathLoading ? '…' : mathQuestion ? `${mathQuestion} = ?` : '—'}
          </span>
          <button
            type="button"
            onClick={() => void refreshMathChallenge()}
            disabled={mathLoading}
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap disabled:opacity-50',
              siteInline
                ? 'rounded-pill p-1 text-mist hover:text-bone'
                : adminInline
                  ? 'rounded-md p-1.5 text-primary hover:bg-surface-soft'
                  : inline
                    ? 'rounded-full px-2 py-1 text-[#007aff] hover:bg-white/60'
                    : 'text-caption font-medium text-accent hover:underline',
            )}
            aria-label="سؤال جدید"
            title="سؤال جدید"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', mathLoading && 'animate-spin')} />
            {inline ? null : <span className="sr-only">سؤال جدید</span>}
          </button>
          <input
            id={answerInputId}
            name={inline && variant !== 'admin' ? 'chatbot_captcha_answer' : undefined}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={mathAnswer}
            onChange={(e) => {
              const value = sanitizeNumericInput(e.target.value);
              setMathAnswer(value);
              syncMathPayload(mathId, value);
            }}
            onPaste={(e) => {
              e.preventDefault();
              const value = sanitizeNumericInput(e.clipboardData.getData('text'));
              setMathAnswer(value);
              syncMathPayload(mathId, value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const trimmed = mathAnswer.trim();
                if (mathId && trimmed) {
                  onMathSubmit?.({ captcha_id: mathId, captcha_answer: trimmed });
                }
                return;
              }
              if (e.ctrlKey || e.metaKey || e.altKey) return;
              const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
              if (allowed.includes(e.key)) return;
              if (!isNumericInputKey(e.key)) e.preventDefault();
            }}
            className={cn(
              'captcha-math-answer min-w-0 px-2 outline-none',
              siteTight
                ? pillEmbed
                  ? 'h-7 w-10 shrink-0 border-0 border-b border-bone/20 bg-transparent text-center text-[10px] text-bone placeholder:text-mist focus:border-emerald/50 focus:outline-none'
                  : 'h-7 w-11 shrink-0 rounded-pill border border-bone/18 bg-charcoal-2/80 text-center text-[10px] text-bone placeholder:text-mist focus:border-emerald/40'
                : siteInline
                  ? 'h-8 min-w-[4.5rem] flex-1 rounded-pill border border-bone/18 bg-charcoal-2/80 px-2.5 text-start text-xs text-bone placeholder:text-mist focus:border-emerald/40 focus:ring-1 focus:ring-emerald/20'
                  : adminInline
                    ? 'field-input h-9 min-h-11 min-w-[4.5rem] flex-1 shrink-0 py-0 text-center text-small placeholder:text-text-muted'
                    : inline
                      ? 'h-9 w-16 shrink-0 rounded-full border border-white/75 bg-white/55 text-center text-[14px] text-emerald-deep shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md focus:border-[#007aff]/40 focus:ring-2 focus:ring-[#007aff]/15'
                      : 'h-9 w-24 shrink-0 rounded-md border border-bone/15 bg-charcoal-2/80 py-0 text-small text-bone placeholder:text-mist',
            )}
            placeholder={
              siteInline && inline && !pillEmbed
                ? 'جواب را بنویسید'
                : inline
                  ? '؟'
                  : 'پاسخ'
            }
            aria-label="پاسخ کپچا"
            title={siteInline && inline && !pillEmbed ? 'جواب سؤال ریاضی را وارد کنید' : undefined}
            disabled={mathLoading || !mathId}
          />
        </div>
      )}

      {loadError && mode === 'math' && (
        <p className={cn('text-gold', siteInline || compact || inline ? 'text-[10px]' : 'mt-2 text-small')}>{loadError}</p>
      )}

      {mode === 'recaptcha' && !pillEmbed && !compact && (
        <p className="mt-2 text-[10px] text-text-muted">
          این سایت توسط reCAPTCHA محافظت می‌شود و{' '}
          <a href="https://policies.google.com/privacy" className="underline" target="_blank" rel="noopener noreferrer">
            حریم خصوصی
          </a>{' '}
          و{' '}
          <a href="https://policies.google.com/terms" className="underline" target="_blank" rel="noopener noreferrer">
            شرایط
          </a>{' '}
          Google اعمال می‌شود.
        </p>
      )}
    </div>
  );
});

function useCaptchaFieldState() {
  const [ready, setReady] = useState(false);
  const [payload, setPayload] = useState<CaptchaPayload | null>(null);
  const resetKeyRef = useRef(0);
  const [resetKey, setResetKey] = useState(0);

  const reset = useCallback(() => {
    resetKeyRef.current += 1;
    setResetKey(resetKeyRef.current);
    setReady(false);
    setPayload(null);
  }, []);

  return {
    ready,
    payload,
    reset,
    resetKey,
    fieldProps: {
      onReadyChange: setReady,
      onPayloadChange: setPayload,
    } satisfies Omit<CaptchaFieldProps, 'className' | 'siteKey'>,
  };
}

type CaptchaGateOptions = {
  /** When false, defers /api/captcha/config until the form needs it. Default true. */
  active?: boolean;
};

/** Loads public captcha config and exposes field state. Skips captcha when disabled in admin. */
export function useCaptchaGate(options?: CaptchaGateOptions) {
  const networkActive = options?.active ?? true;
  const captcha = useCaptchaFieldState();
  const [config, setConfig] = useState<CaptchaPublicConfig | null>(null);

  useEffect(() => {
    if (!networkActive) return;

    let active = true;
    fetchCaptchaPublicConfig()
      .then((value) => {
        if (active) setConfig(value);
      })
      .catch(() => {
        if (active) {
          setConfig({
            enabled: true,
            site_key: '',
            has_recaptcha: false,
            has_turnstile: false,
            honeypot_enabled: true,
            protect_newsletter: true,
            protect_leads: true,
            protect_admin_login: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [networkActive]);

  const required = networkActive ? (config?.enabled ?? false) : false;
  const loading = !networkActive || config === null;
  const ready = !networkActive ? false : !required || captcha.ready;

  return {
    config,
    required,
    loading,
    ready,
    /** Raw field state — use when captcha UI is shown regardless of global admin toggle. */
    fieldReady: captcha.ready,
    fieldPayload: captcha.payload,
    payload: required ? captcha.payload : null,
    siteKey: config?.site_key ?? '',
    reset: captcha.reset,
    resetKey: captcha.resetKey,
    fieldProps: captcha.fieldProps,
  };
}

/** @deprecated Prefer useCaptchaGate for forms that respect admin captcha settings. */
export function useCaptchaField() {
  return useCaptchaFieldState();
}
