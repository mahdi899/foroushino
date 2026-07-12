'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, Phone, X } from 'lucide-react';
import { useStudentFormPrefill } from '@/components/student-panel/auth/StudentAuthContext';
import { saveChatbotPhone } from '@/lib/chatbot/actions';
import { isValidIranMobile, normalizeIranMobile, sanitizePhoneInput } from '@/lib/chatbot/phone';

interface ChatbotPhoneModalProps {
  open: boolean;
  onClose: () => void;
  sessionId: string;
  onSaved: (phone: string) => void;
}

export function ChatbotPhoneModal({
  open,
  onClose,
  sessionId,
  onSaved,
}: ChatbotPhoneModalProps) {
  const prefill = useStudentFormPrefill();
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(true);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (prefill?.phone) {
      onSaved(prefill.phone);
      onClose();
      return;
    }
    setPhone('');
    setConsent(true);
    setStatus('idle');
    setError(null);
  }, [open, prefill, onSaved, onClose]);

  useEffect(() => {
    if (status !== 'done') return;
    const timer = window.setTimeout(() => {
      onClose();
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [status, onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIranMobile(phone)) {
      setError('شماره موبایل معتبر وارد کنید (مثلاً ۰۹۱۲۳۴۵۶۷۸۹).');
      setStatus('error');
      return;
    }
    if (!consent) {
      setError('برای ثبت شماره، موافقت با تماس مشاور لازم است.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    const normalized = normalizeIranMobile(phone);
    const res = await saveChatbotPhone({
      sessionId,
      phone: normalized,
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    if (!res.ok) {
      setStatus('error');
      setError(
        res.error === 'invalid'
          ? 'شماره موبایل معتبر نیست.'
          : 'ثبت شماره ناموفق بود. لطفاً دوباره تلاش کنید.',
      );
      return;
    }

    onSaved(normalized);
    setStatus('done');
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="absolute inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
          <motion.button
            type="button"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            aria-label="بستن"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="chatbot-phone-title"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[18rem] overflow-hidden rounded-xl border border-border/60 bg-white shadow-premium ring-1 ring-black/[0.06]"
            dir="rtl"
          >
            <div className="flex items-start justify-between gap-2 border-b border-border/50 bg-gradient-ai px-4 py-3 text-white">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-white/20">
                  <Phone className="h-4 w-4" />
                </span>
                <div>
                  <p id="chatbot-phone-title" className="text-[13px] font-bold">
                    ثبت شماره تماس
                  </p>
                  <p className="text-[10px] opacity-90">تیم بهرام با شما تماس می‌گیرد</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition hover:bg-white/15"
                aria-label="بستن"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {status === 'done' ? (
              <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
                <CheckCircle2 className="h-10 w-10 text-success" />
                <p className="text-[13px] font-semibold text-primary-dark">شماره شما ثبت شد</p>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  به‌زودی با شما تماس می‌گیریم.
                </p>
              </div>
            ) : (
              <form onSubmit={(e) => void handleSubmit(e)} className="space-y-3 p-4">
                <p className="text-[12px] leading-relaxed text-text-muted">
                  شماره موبایل خود را وارد کنید تا برای پیگیری دقیق‌تر با شما تماس بگیریم.
                </p>
                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  dir="ltr"
                  autoFocus
                  value={phone}
                  onChange={(e) => {
                    setPhone(sanitizePhoneInput(e.target.value));
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  maxLength={11}
                  pattern="09[0-9]{9}"
                  className="field-input h-10 py-0 text-[14px]"
                  aria-label="شماره موبایل"
                  disabled={status === 'loading'}
                />
                <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-relaxed text-text-muted">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 shrink-0"
                  />
                  <span>با تماس تیم بهرام برای مشاوره اولیه موافقم.</span>
                </label>
                {error && <p className="text-[11px] text-error">{error}</p>}
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="btn btn-primary w-full py-2.5 text-[13px]"
                >
                  {status === 'loading' ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    'ثبت و درخواست تماس'
                  )}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
