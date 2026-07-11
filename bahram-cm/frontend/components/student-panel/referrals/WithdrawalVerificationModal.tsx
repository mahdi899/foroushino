'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Loader2, X } from 'lucide-react';
import { CashbackPayoutForm } from './CashbackPayoutForm';
import { verifyMobileOwnershipAction } from '@/lib/student/identityActions';
import { usePanelToast } from '@/components/student-panel/ui/PanelToastContext';

export function WithdrawalVerificationModal({
  verificationLevel,
  payableAmount,
}: {
  verificationLevel: number;
  payableAmount: number;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { showToast } = usePanelToast();

  if (payableAmount <= 0) {
    return <p className="text-sm text-text-muted">در حال حاضر مبلغی برای درخواست واریز وجود ندارد.</p>;
  }

  if (verificationLevel >= 3) {
    return <CashbackPayoutForm payableAmount={payableAmount} />;
  }

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={() => setOpen(true)}>
        درخواست واریز کش‌بک
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" role="dialog">
          <div className="card relative w-full max-w-md p-5 shadow-lg">
            <button
              type="button"
              className="absolute left-3 top-3 rounded-lg p-1 text-text-muted hover:bg-surface-soft"
              onClick={() => setOpen(false)}
              aria-label="بستن"
            >
              <X size={18} />
            </button>

            {verificationLevel < 2 ? (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-text">تأیید حساب لازم است</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  برای دریافت کش‌بک، ابتدا هویت خود را تأیید کنید. پس از تأیید، می‌توانید مالکیت شماره موبایل را نیز تکمیل کنید.
                </p>
                <Link href="/panel/identity-verification" className="btn btn-primary w-full justify-center">
                  رفتن به تأیید هویت
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-text">تأیید مالکیت شماره موبایل</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  هویت شما تأیید شده است. برای برداشت، باید مطابقت شماره موبایل با کد ملی تأیید شود. اطلاعات از پرونده تأییدشده شما استفاده می‌شود.
                </p>
                <button
                  type="button"
                  className="btn btn-primary w-full justify-center"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const res = await verifyMobileOwnershipAction();
                      if (res.error) {
                        showToast({ tone: 'error', title: 'تأیید ناموفق', message: res.error });
                        return;
                      }
                      showToast({
                        tone: 'success',
                        title: 'تأیید شد',
                        message: res.success ?? 'مالکیت شماره موبایل تأیید شد.',
                      });
                      window.setTimeout(() => window.location.reload(), 700);
                    });
                  }}
                >
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  تأیید مالکیت شماره
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
