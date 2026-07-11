'use client';

import { useActionState } from 'react';
import { requestCashbackPayoutAction, type SimpleFormState } from '@/lib/student/panelActions';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';

const INITIAL: SimpleFormState = {};

export function CashbackPayoutForm({ payableAmount }: { payableAmount: number }) {
  const [state, action] = useActionState(requestCashbackPayoutAction, INITIAL);

  usePanelFormFeedback(state, {
    successTitle: 'درخواست ثبت شد',
    errorTitle: 'ثبت ناموفق',
  });

  if (payableAmount <= 0) {
    return <p className="text-sm text-text-muted">در حال حاضر مبلغی برای درخواست واریز وجود ندارد.</p>;
  }

  return (
    <form action={action} className="panel-form-grid">
      <p className="panel-form-grid__full text-sm text-text-muted">
        مبلغ قابل دریافت: <span className="font-bold text-text">{payableAmount.toLocaleString('fa-IR')} تومان</span>
      </p>
      <div className="panel-form-grid__full">
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
      <button type="submit" className="btn btn-primary panel-form-grid__full">ثبت درخواست واریز</button>
    </form>
  );
}
