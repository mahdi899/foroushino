'use client';

import { useActionState } from 'react';
import { requestCashbackPayoutAction, type SimpleFormState } from '@/lib/student/panelActions';

const INITIAL: SimpleFormState = {};

export function CashbackPayoutForm({ payableAmount }: { payableAmount: number }) {
  const [state, action] = useActionState(requestCashbackPayoutAction, INITIAL);

  if (payableAmount <= 0) {
    return <p className="text-sm text-text-muted">در حال حاضر مبلغی برای درخواست واریز وجود ندارد.</p>;
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-text-muted">
        مبلغ قابل دریافت: <span className="font-bold text-text">{payableAmount.toLocaleString('fa-IR')} تومان</span>
      </p>
      <div>
        <label className="field-label" htmlFor="card_number">شماره کارت (۱۶ رقم)</label>
        <input
          id="card_number"
          name="card_number"
          inputMode="numeric"
          maxLength={19}
          placeholder="6037 **** **** ****"
          className="field-input"
          dir="ltr"
          required
        />
      </div>
      <div>
        <label className="field-label" htmlFor="card_holder_name">نام صاحب کارت (اختیاری)</label>
        <input id="card_holder_name" name="card_holder_name" className="field-input" />
      </div>
      {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <button type="submit" className="btn btn-primary">ثبت درخواست واریز</button>
    </form>
  );
}
