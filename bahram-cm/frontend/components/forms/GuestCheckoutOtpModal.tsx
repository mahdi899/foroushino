'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Loader2, Phone, ShieldCheck, X } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { OtpDigitInput } from '@/components/student-panel/auth/OtpDigitInput';

type GuestCheckoutOtpModalProps = {
  open: boolean;
  phoneMasked: string | null;
  otpInfo: string | null;
  otpCode: string;
  onOtpChange: (code: string) => void;
  onComplete: (code: string) => void;
  onResend: () => void;
  onEditPhone: () => void;
  resendIn: number;
  submitting: boolean;
  error: string | null;
  isFreeProduct: boolean;
};

export function GuestCheckoutOtpModal({
  open,
  phoneMasked,
  otpInfo,
  otpCode,
  onOtpChange,
  onComplete,
  onResend,
  onEditPhone,
  resendIn,
  submitting,
  error,
  isFreeProduct,
}: GuestCheckoutOtpModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onEditPhone();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onEditPhone, submitting]);

  if (!mounted) return null;

  const resendNotice = otpInfo?.includes('جدید') ? otpInfo : null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-5">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 cursor-pointer border-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0.72)_100%)] backdrop-blur-[3px]"
            aria-hidden
            onClick={() => {
              if (!submitting) onEditPhone();
            }}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[20rem]"
            role="dialog"
            aria-modal
            aria-labelledby="guest-checkout-otp-title"
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full overflow-hidden rounded-2xl border border-bone/10 bg-charcoal/96 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.55)]">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-l from-transparent via-emerald-glow/40 to-transparent"
              />

              <div className="relative px-5 pb-4 pt-4">
                <button
                  type="button"
                  onClick={onEditPhone}
                  disabled={submitting}
                  className="absolute start-3.5 top-3.5 grid h-8 w-8 place-items-center rounded-full text-mist transition hover:bg-bone/6 hover:text-bone disabled:opacity-50"
                  aria-label="بستن"
                >
                  <X className="h-4 w-4" />
                </button>

                <div className="text-center">
                  <BrandMark className="mx-auto h-9 w-9 rounded-pill ring-bone/12" />
                  <h2 id="guest-checkout-otp-title" className="panel-text-body-lg mt-2.5 font-display font-semibold text-bone">
                    تأیید شماره موبایل
                  </h2>
                  <p className="mt-0.5 flex items-center justify-center gap-1 panel-text-meta text-mist">
                    <ShieldCheck className="h-3 w-3 text-emerald-glow/80" strokeWidth={1.5} aria-hidden />
                    {isFreeProduct ? 'ثبت‌نام امن با پیامک' : 'پرداخت امن با پیامک'}
                  </p>
                </div>
              </div>

              <div className="space-y-4 border-t border-bone/6 px-5 py-4">
                <div className="guest-checkout-otp-phone rounded-2xl border border-emerald/15 bg-gradient-to-b from-emerald/[0.09] via-charcoal/20 to-ink/30 px-4 py-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full border border-emerald/25 bg-emerald/10 shadow-[0_0_20px_-6px_rgba(37,160,166,0.55)]">
                    <Phone className="h-[1.125rem] w-[1.125rem] text-emerald-glow" strokeWidth={1.65} aria-hidden />
                  </div>

                  <p className="text-[0.8rem] leading-relaxed text-mist">کد تأیید ۵ رقمی به شماره زیر پیامک شد</p>

                  <p
                    className="num-latin mt-2 text-[1.05rem] font-bold tracking-[0.06em] text-bone"
                    dir="ltr"
                  >
                    {phoneMasked ?? '—'}
                  </p>

                  <button
                    type="button"
                    onClick={onEditPhone}
                    disabled={submitting}
                    className="mt-3 inline-flex items-center justify-center gap-1 rounded-pill border border-bone/10 bg-bone/[0.04] px-3 py-1.5 text-[0.78rem] font-medium text-bone-dim transition hover:border-emerald/25 hover:bg-emerald/8 hover:text-emerald-glow disabled:opacity-50"
                  >
                    <ArrowRight className="h-3.5 w-3.5 rtl-flip" aria-hidden />
                    تغییر شماره
                  </button>

                  {resendNotice ? (
                    <p className="mt-2.5 text-[0.78rem] font-medium text-emerald-glow">{resendNotice}</p>
                  ) : null}
                </div>

                <OtpDigitInput
                  value={otpCode}
                  onChange={onOtpChange}
                  onComplete={onComplete}
                  disabled={submitting}
                  error={Boolean(error)}
                  autoFocus
                  compact
                />

                {error ? (
                  <p className="text-center panel-text-meta text-gold" role="alert">
                    {error}
                  </p>
                ) : null}

                {submitting ? (
                  <div className="flex items-center justify-center gap-2 py-1 panel-text-meta text-mist">
                    <Loader2 className="h-4 w-4 animate-spin text-emerald-glow" aria-hidden />
                    {isFreeProduct ? 'در حال ثبت سفارش…' : 'در حال انتقال به درگاه…'}
                  </div>
                ) : null}

                <p className="text-center panel-text-meta text-mist">
                  {resendIn > 0 ? (
                    <>ارسال مجدد تا {resendIn.toLocaleString('fa-IR')} ثانیه</>
                  ) : (
                    <button
                      type="button"
                      onClick={onResend}
                      disabled={submitting}
                      className="font-medium text-emerald-glow transition hover:text-emerald disabled:opacity-50"
                    >
                      ارسال مجدد کد
                    </button>
                  )}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
