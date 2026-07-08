'use client';

import { useCallback, useEffect, useId, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { fetchMathCaptcha, fetchCaptchaPublicConfig } from '@/lib/captcha/api';
import {
  isTurnstileConfigured,
  resolveTurnstileSiteKey,
  TURNSTILE_LOAD_TIMEOUT_MS,
  TURNSTILE_SCRIPT_URL,
} from '@/lib/captcha/config';
import type { CaptchaMode, CaptchaPayload, CaptchaPublicConfig } from '@/lib/captcha/types';
import { sanitizeNumericInput, isNumericInputKey } from '@/lib/captcha/numericInput';
import { cn } from '@/lib/utils';

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  'error-callback'?: () => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Turnstile is browser-only'));
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="true"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Turnstile script failed')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = TURNSTILE_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Turnstile script failed'));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
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
  /** Cloudflare Turnstile passed — verify on server before unlocking chat. */
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
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const payloadRef = useRef<CaptchaPayload | null>(null);
  const answerInputId = useId();
  const turnstileSiteKey = resolveTurnstileSiteKey(siteKey);

  const [mode, setMode] = useState<CaptchaMode>('loading');
  const [mathQuestion, setMathQuestion] = useState('');
  const [mathId, setMathId] = useState('');
  const [mathAnswer, setMathAnswer] = useState('');
  const [mathLoading, setMathLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useImperativeHandle(
    ref,
    () => ({
      getPayload: (): CaptchaPayload | null => payloadRef.current,
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

  const cleanupTurnstile = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    }
  }, []);

  const mathFetchGenRef = useRef(0);

  const activateMathMode = useCallback(async () => {
    cleanupTurnstile();
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
  }, [cleanupTurnstile, notifyPayload, notifyReady]);

  const renderTurnstile = useCallback(async () => {
    // Pill / chatbot inline — math captcha only; Turnstile breaks single-row layout.
    if (!isTurnstileConfigured(turnstileSiteKey) || pillEmbed || (compact && inline)) {
      await activateMathMode();
      return;
    }

    setMode('loading');
    setLoadError(null);
    notifyReady(false);
    notifyPayload(null);

    try {
      await Promise.race([
        loadTurnstileScript(),
        new Promise((_, reject) => {
          window.setTimeout(() => reject(new Error('Turnstile timeout')), TURNSTILE_LOAD_TIMEOUT_MS);
        }),
      ]);

      if (!window.turnstile || !containerRef.current) {
        throw new Error('Turnstile unavailable');
      }

      cleanupTurnstile();
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: turnstileSiteKey,
        theme: 'light',
        language: 'fa',
        callback: (token) => {
          setMode('turnstile');
          setLoadError(null);
          notifyReady(true);
          notifyPayload({ captcha_token: token });
          onHumanVerified?.({ captcha_token: token });
        },
        'error-callback': () => {
          void activateMathMode();
        },
        'expired-callback': () => {
          notifyReady(false);
          notifyPayload(null);
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current);
          }
        },
      });

      setMode('turnstile');
    } catch {
      await activateMathMode();
    }
  }, [activateMathMode, cleanupTurnstile, compact, inline, notifyPayload, notifyReady, onHumanVerified, pillEmbed, turnstileSiteKey]);

  const renderTurnstileRef = useRef(renderTurnstile);
  renderTurnstileRef.current = renderTurnstile;

  useEffect(() => {
    if (!active) return;
    void renderTurnstileRef.current();
    return () => {
      cleanupTurnstile();
    };
  }, [active, cleanupTurnstile]);

  useEffect(() => {
    if (mode !== 'math') return;

    const trimmed = mathAnswer.trim();
    if (!mathId || !trimmed) {
      notifyReady(false);
      notifyPayload(null);
      return;
    }

    notifyReady(true);
    notifyPayload({
      captcha_id: mathId,
      captcha_answer: trimmed,
    });
  }, [mathAnswer, mathId, mode, notifyPayload, notifyReady]);

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
  const mathOnly = pillEmbed || (compact && inline);

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

      {mode === 'loading' && !mathOnly && (
        <div className={cn('flex items-center gap-2 text-text-muted', compact && inline ? 'text-[11px]' : 'text-small')}>
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          {compact && inline ? '…' : 'در حال بارگذاری تأیید امنیتی...'}
        </div>
      )}

      {mode === 'loading' && mathOnly && (
        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-mist" aria-hidden />
      )}

      {!mathOnly && (mode === 'loading' || mode === 'turnstile') && (
        <div ref={containerRef} className="min-h-[65px]" aria-hidden={mode !== 'turnstile'} />
      )}

      {mode === 'math' && (
        <div
          className={cn(
            'relative z-20 flex w-full min-w-0 flex-nowrap items-center gap-1.5',
            siteInline ? 'max-w-full' : inline ? 'text-[12px]' : 'w-full text-small',
          )}
          dir="ltr"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <span
            className={cn(
              'shrink-0 whitespace-nowrap font-semibold tabular-nums',
              siteTight
                ? pillEmbed
                  ? 'px-0.5 text-[10px] text-mist'
                  : 'rounded-pill border border-bone/12 bg-charcoal/40 px-2 py-0.5 text-[10px] text-bone'
                : siteInline
                  ? 'rounded-pill border border-bone/12 bg-charcoal/40 px-2.5 py-1 text-xs text-bone'
                  : adminInline
                    ? 'rounded-full border border-border bg-primary-soft px-3 py-1.5 text-center text-[13px] text-primary-dark'
                    : inline
                      ? 'rounded-full border border-white/70 bg-white/60 px-3 py-1.5 text-center text-[13px] text-primary-dark shadow-[0_1px_3px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md'
                      : 'rounded-md bg-primary-soft/50 px-3 py-1.5 text-primary-dark',
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
            onChange={(e) => setMathAnswer(sanitizeNumericInput(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              setMathAnswer(sanitizeNumericInput(e.clipboardData.getData('text')));
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
              'min-w-0 px-2 outline-none',
              siteTight
                ? pillEmbed
                  ? 'h-7 w-10 shrink-0 border-0 border-b border-bone/20 bg-transparent text-center text-[10px] text-bone placeholder:text-mist focus:border-emerald/50 focus:outline-none'
                  : 'h-7 w-11 shrink-0 rounded-pill border border-bone/12 bg-transparent text-center text-[10px] text-bone placeholder:text-mist focus:border-emerald/40'
                : siteInline
                  ? 'h-8 min-w-[4.5rem] flex-1 rounded-pill border border-bone/12 bg-charcoal/50 px-2.5 text-start text-xs text-bone placeholder:text-mist focus:border-emerald/40 focus:ring-1 focus:ring-emerald/20'
                  : adminInline
                    ? 'field-input h-9 min-h-11 min-w-[4.5rem] flex-1 shrink-0 py-0 text-center text-small placeholder:text-text-muted'
                    : inline
                      ? 'h-9 w-16 shrink-0 rounded-full border border-white/75 bg-white/55 text-center text-[14px] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-md focus:border-[#007aff]/40 focus:ring-2 focus:ring-[#007aff]/15'
                      : 'field-input h-9 w-24 shrink-0 py-0 text-small',
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
        if (active) setConfig({ enabled: true, site_key: '', has_turnstile: false, honeypot_enabled: true, protect_newsletter: true, protect_leads: true, protect_admin_login: true });
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
