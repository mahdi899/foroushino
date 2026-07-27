'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateVerifiedBankAccountStatus } from '../actions';
import type { AdminVerifiedBankAccount } from '@/lib/admin/academyTypes';

export function BankAccountRow({ account }: { account: AdminVerifiedBankAccount }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function decide(status: 'verified' | 'rejected') {
    const note = status === 'rejected' ? window.prompt('دلیل رد (اختیاری):') ?? undefined : undefined;
    startTransition(async () => {
      await updateVerifiedBankAccountStatus(account.id, status, note);
      router.refresh();
    });
  }

  return (
    <tr className="hover:bg-surface-soft/40">
      <td className="px-4 py-3">
        {account.user_name ?? '—'} <span className="text-caption text-text-muted" dir="ltr">{account.user_mobile}</span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 font-mono" dir="ltr">
        {account.masked_card_number ?? account.masked_iban ?? '—'}
      </td>
      <td className="px-4 py-3">{account.holder_name ?? '—'}</td>
      <td className="whitespace-nowrap px-4 py-3 text-caption">
        {account.created_at ? new Date(account.created_at).toLocaleDateString('fa-IR') : '—'}
      </td>
      <td className="px-4 py-3">
        {account.status === 'pending' ? (
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" disabled={pending} onClick={() => decide('verified')}>
              تأیید
            </button>
            <button type="button" className="btn btn-secondary btn-sm text-error" disabled={pending} onClick={() => decide('rejected')}>
              رد
            </button>
          </div>
        ) : (
          <span className={account.status === 'verified' ? 'text-success' : 'text-error'}>
            {account.status === 'verified' ? 'تأییدشده' : 'ردشده'}
          </span>
        )}
      </td>
    </tr>
  );
}
