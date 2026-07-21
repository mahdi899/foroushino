'use client';

import { ArrowLeft, Loader2, MapPin, User2 } from 'lucide-react';
import { useActionState, useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { LoggedInUserSummary } from '@/components/forms/LoggedInUserSummary';
import { useStudentAuthOptional, useStudentFormPrefill } from '@/components/student-panel/auth/StudentAuthContext';
import { cn } from '@/lib/cn';
import { submitSatApplicationAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';

const DRAFT_KEY = 'saat-apply-draft';
const INITIAL: SimpleFormState = {};

type Draft = { name: string; city: string; age: string };

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
    const parsed = JSON.parse(raw) as Draft;
    return {
      name: typeof parsed.name === 'string' ? parsed.name : '',
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
  const auth = useStudentAuthOptional();
  const prefill = useStudentFormPrefill();
  const isLoggedIn = Boolean(auth?.isLoggedIn || prefill);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [guestHint, setGuestHint] = useState('');
  const restoredRef = useRef(false);
  const [state, action, pending] = useActionState(submitSatApplicationAction, INITIAL);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = readDraft();
    if (draft) {
      setName(draft.name);
      setCity(draft.city);
      setAge(draft.age);
      return;
    }
    if (prefill?.name) setName(prefill.name);
  }, [prefill?.name]);

  useEffect(() => {
    if (state.success) clearDraft();
  }, [state.success]);

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

  const onGuestGate = (event: FormEvent<HTMLFormElement>) => {
    if (isLoggedIn) return;
    event.preventDefault();
    writeDraft({ name: name.trim(), city: city.trim(), age: age.trim() });
    setGuestHint('برای ثبت درخواست، اول وارد حساب شو — بعد از ورود همین فرم را ارسال کن.');
    if (auth?.openLogin) {
      auth.openLogin({ redirectTo: '/saat#apply' });
      return;
    }
    window.location.assign(`/panel/login?redirect=${encodeURIComponent('/saat#apply')}`);
  };

  return (
    <form
      action={action}
      onSubmit={onGuestGate}
      className={cn(
        'neon-surface-static relative rounded-card-lg border border-gold/22 bg-charcoal/55 p-5 md:p-7',
        className,
      )}
      noValidate={false}
    >
      <div className="space-y-4">
        {prefill ? (
          <LoggedInUserSummary prefill={prefill} className="border-gold/15 [&_svg]:text-gold" />
        ) : (
          <p className="rounded-tile border border-gold/18 bg-gold/[0.06] px-3 py-2.5 text-sm leading-relaxed text-bone-dim">
            اگر حساب نداری، بعد از پر کردن فرم با شماره موبایل وارد می‌شوی و درخواست ثبت می‌شود.
          </p>
        )}

        <label htmlFor={`${formId}-name`} className="block min-w-0">
          <span className="block text-caption text-bone">نام و نام خانوادگی *</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-mist">
              <User2 className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            </span>
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setGuestHint('');
              }}
              disabled={pending}
              className={cn(inputClass, 'ps-10')}
            />
          </div>
        </label>

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
                  setGuestHint('');
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
                setGuestHint('');
              }}
              disabled={pending}
              className={cn(inputClass, 'num-latin')}
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="group neon-btn-primary inline-flex h-12 min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-gold px-6 text-sm font-semibold text-ink transition-[background-color,transform,box-shadow] duration-300 ease-[var(--ease-luxe)] hover:bg-gold-soft hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <>
              <span>{isLoggedIn ? 'ثبت درخواست سات' : 'ورود و ثبت درخواست'}</span>
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
            !guestHint && !state.error && 'hidden',
            (guestHint || state.error) && 'text-gold',
          )}
        >
          {guestHint || state.error}
        </p>

        <p className="text-center text-caption text-mist">
          اطلاعات فقط برای بررسی درخواست استفاده می‌شود.
        </p>
      </div>
    </form>
  );
}
