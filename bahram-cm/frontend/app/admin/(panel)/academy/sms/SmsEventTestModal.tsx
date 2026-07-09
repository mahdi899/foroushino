'use client';

import { useEffect, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';

const STORAGE_KEY = 'bahram-sms-event-test-phone';

export function readStoredTestPhone(fallback = ''): string {
  if (typeof window === 'undefined') return fallback;
  return sessionStorage.getItem(STORAGE_KEY) ?? fallback;
}

export function storeTestPhone(phone: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, phone);
}

export function SmsEventTestModal({
  open,
  eventLabel,
  defaultPhone,
  pending,
  onClose,
  onSubmit,
}: {
  open: boolean;
  eventLabel: string;
  defaultPhone?: string | null;
  pending: boolean;
  onClose: () => void;
  onSubmit: (phone: string) => void;
}) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setPhone(readStoredTestPhone(defaultPhone ?? ''));
    setError('');
  }, [open, defaultPhone]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !pending) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  function submit() {
    const value = phone.trim();
    if (!value) {
      setError('شماره موبایل را وارد کنید.');
      return;
    }
    storeTestPhone(value);
    onSubmit(value);
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 admin-overlay" onClick={pending ? undefined : onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-floating">
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <p className="font-semibold text-primary-dark">تست رویداد پیامک</p>
            <p className="mt-0.5 text-caption text-text-muted">{eventLabel}</p>
          </div>
          <button type="button" onClick={onClose} disabled={pending} className="rounded-lg p-1 text-text-muted hover:bg-surface-soft">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <label>
            <span className="field-label text-caption">شماره موبایل گیرنده</span>
            <input
              className="field-input mt-1 text-small"
              dir="ltr"
              inputMode="tel"
              autoFocus
              placeholder="09xxxxxxxxx"
              value={phone}
              disabled={pending}
              onChange={(e) => {
                setPhone(e.target.value);
                if (error) setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submit();
                }
              }}
            />
          </label>
          <p className="admin-text-meta text-text-muted">پیام با تنظیمات فعلی همین رویداد (بدون ذخیره) ارسال می‌شود.</p>
          {error ? <p className="text-caption text-error">{error}</p> : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-5 py-3">
          <button type="button" onClick={onClose} disabled={pending} className="btn btn-secondary px-4 py-1.5 text-caption">
            انصراف
          </button>
          <button type="button" onClick={submit} disabled={pending} className="btn btn-primary px-4 py-1.5 text-caption">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            ارسال تست
          </button>
        </div>
      </div>
    </div>
  );
}
