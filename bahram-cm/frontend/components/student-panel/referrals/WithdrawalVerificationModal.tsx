'use client';

import { useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { CashbackPayoutForm } from './CashbackPayoutForm';
import type { VerifiedBankAccount } from '@/lib/student/bankAccountActions';

export function WithdrawalVerificationModal({
  verificationLevel,
  payableAmount,
  bankAccounts,
}: {
  verificationLevel: number;
  payableAmount: number;
  bankAccounts: VerifiedBankAccount[];
}) {
  const [open, setOpen] = useState(false);

  if (payableAmount <= 0) {
    return <p className="text-sm text-text-muted">در حال حاضر مبلغی برای درخواست واریز وجود ندارد.</p>;
  }

  const identityApproved = verificationLevel >= 2;
  const hasVerifiedCard = bankAccounts.length > 0;

  if (identityApproved && hasVerifiedCard) {
    return <CashbackPayoutForm payableAmount={payableAmount} accounts={bankAccounts} />;
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

            {!identityApproved ? (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-text">تأیید حساب لازم است</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  برای دریافت کش‌بک، ابتدا هویت خود را تأیید کنید. سپس می‌توانید کارت بانکی را با سرویس شاهکار احراز کنید.
                </p>
                <Link href="/panel/identity-verification" className="btn btn-primary w-full justify-center">
                  رفتن به تأیید هویت
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-base font-bold text-text">احراز کارت بانکی لازم است</h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  هویت شما تأیید شده است. برای برداشت، ابتدا شماره کارت یا شبا را در بخش زیر ثبت و با شاهکار تأیید کنید.
                </p>
                <button type="button" className="btn btn-primary w-full justify-center" onClick={() => setOpen(false)}>
                  متوجه شدم
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
