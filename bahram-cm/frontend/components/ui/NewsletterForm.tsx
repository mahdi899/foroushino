'use client';

import { ArrowLeft, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { track } from '@/lib/analytics';
import { cn } from '@/lib/cn';
import { useFormSecurity } from '@/components/captcha/FormCaptcha';
import { isValidEmail, subscribeNewsletter } from '@/lib/services/newsletter';

type Status = 'idle' | 'loading' | 'ok' | 'err';

export function NewsletterForm({
  className,
  density = 'default',
  source = 'web_newsletter',
}: {
  className?: string;
  /** `compact`: فشرده برای فوتر */
  density?: 'default' | 'compact';
  source?: string;
}) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const { captchaField, honeypotField, captchaRequired, captchaReady, securityLoading, getSecurityPayload } =
    useFormSecurity('newsletter', { captchaTight: true });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setStatus('err');
      setMessage('ایمیل را درست وارد کن.');
      return;
    }

    const { captcha, website } = getSecurityPayload();
    if (captchaRequired && !captcha) {
      setStatus('err');
      setMessage('لطفاً تأیید امنیتی را تکمیل کن.');
      return;
    }

    setStatus('loading');
    setMessage('');
    const result = await subscribeNewsletter(email, source, captcha, website);
    if (result.ok) {
      setStatus('ok');
      setMessage('ثبت شد. مراقب صندوق ایمیل باش.');
      setEmail('');
      track('newsletter_signup', { source, status: result.data.status });
    } else {
      setStatus('err');
      setMessage(result.error);
    }
  };

  const compact = density === 'compact';
  const rowHeight = compact ? 'h-10 min-h-10' : 'h-11 min-h-11';

  return (
    <form onSubmit={onSubmit} className={cn('relative w-full min-w-0', className)}>
      {honeypotField}

      {/* یک pill واحد: ایمیل | کپچا | دکمه */}
      <div
        className={cn(
          'flex min-w-0 flex-nowrap items-center gap-1 overflow-x-auto rounded-pill border border-bone/12 bg-charcoal/55 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        <label htmlFor="newsletter-email" className="sr-only">
          ایمیل
        </label>
        <div className="relative min-w-0 flex-1 basis-[8rem]">
          <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
            <Mail className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </span>
          <input
            id="newsletter-email"
            type="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (status !== 'idle') setStatus('idle');
            }}
            disabled={status === 'loading'}
            placeholder="ایمیل تو"
            className={cn(
              'w-full min-w-0 bg-transparent ps-9 pe-2 text-bone placeholder:text-mist focus:outline-none',
              rowHeight,
              compact ? 'text-sm' : 'text-body',
            )}
          />
        </div>

        {captchaRequired ? (
          <>
            <span className="h-6 w-px shrink-0 bg-bone/12" aria-hidden />
            {captchaField}
          </>
        ) : null}

        <button
          type="submit"
          disabled={status === 'loading' || securityLoading || !captchaReady}
          aria-busy={status === 'loading'}
          className={cn(
            'group neon-btn-primary ms-auto inline-flex shrink-0 touch-manipulation items-center justify-center gap-1 rounded-pill bg-emerald px-3 transition-[background-color,color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-emerald-glow hover:-translate-y-px active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70',
            rowHeight,
            compact ? 'text-sm' : 'px-4',
          )}
        >
          {status === 'loading' ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <span className="whitespace-nowrap">عضو می‌شوم</span>
              <ArrowLeft
                className="rtl-flip h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
                aria-hidden
              />
            </>
          )}
        </button>
      </div>

      <p
        role="status"
        aria-live="polite"
        className={cn(
          'mt-2 text-caption transition-opacity',
          status === 'idle' && 'hidden',
          status === 'ok' && 'text-emerald-glow',
          status === 'err' && 'text-gold',
        )}
      >
        {message}
      </p>
    </form>
  );
}
