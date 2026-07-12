'use client';

import { useActionState } from 'react';
import { requestCashbackPayoutAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';
import type { VerifiedBankAccount } from '@/lib/student/bankAccountActions';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';

const INITIAL: SimpleFormState = {};

export function CashbackPayoutForm({
  payableAmount,
  accounts,
}: {
  payableAmount: number;
  accounts: VerifiedBankAccount[];
}) {
  const [state, action] = useActionState(requestCashbackPayoutAction, INITIAL);

  usePanelFormFeedback(state, {
    successTitle: 'درخواست ثبت شد',
    errorTitle: 'ثبت ناموفق',
  });

  if (payableAmount <= 0) {
    return <p className="text-sm text-text-muted">در حال حاضر مبلغی برای درخواست واریز وجود ندارد.</p>;
  }

  if (accounts.length === 0) {
    return (
      <p className="text-sm leading-relaxed text-text-muted">
        ابتدا یک کارت بانکی تأییدشده ثبت کنید تا بتوانید درخواست واریز بدهید.
      </p>
    );
  }

  const defaultAccount = accounts.find((a) => a.is_default) ?? accounts[0];

  return (
    <form action={action} className="panel-form-grid">
      <p className="panel-form-grid__full text-sm text-text-muted">
        مبلغ قابل دریافت: <span className="font-bold text-text">{payableAmount.toLocaleString('fa-IR')} تومان</span>
      </p>

      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="verified_bank_account_id">
          کارت/شبای واریز
        </label>
        <select
          id="verified_bank_account_id"
          name="verified_bank_account_id"
          className="field-input"
          defaultValue={defaultAccount.id}
          required
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.masked_card_number ?? account.masked_iban ?? `حساب #${account.id}`}
              {account.bank_name ? ` — ${account.bank_name}` : ''}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="btn btn-primary panel-form-grid__full">
        ثبت درخواست واریز
      </button>
    </form>
  );
}
