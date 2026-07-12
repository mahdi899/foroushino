'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import {
  addVerifiedBankAccountAction,
  deleteVerifiedBankAccountAction,
  type BankAccountRules,
  type VerifiedBankAccount,
} from '@/lib/student/bankAccountActions';
import type { SimpleFormState } from '@/lib/student/panelActions';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';
import { usePanelToast } from '@/components/student-panel/ui/PanelToastContext';

const INITIAL: SimpleFormState = {};

export function VerifiedBankAccountsPanel({
  accounts,
  rules,
  payableAmount,
  identityApproved,
}: {
  accounts: VerifiedBankAccount[];
  rules: BankAccountRules;
  payableAmount: number;
  identityApproved: boolean;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletePending, startDelete] = useTransition();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const { showToast } = usePanelToast();

  if (!identityApproved) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-text">کارت‌های بانکی تأییدشده</h3>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowAddForm((v) => !v)}>
          {showAddForm ? 'بستن' : 'افزودن کارت/شبا'}
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm leading-relaxed text-text-muted">
          برای برداشت کش‌بک، ابتدا شماره کارت یا شبا را با سرویس شاهکار تأیید کنید.
          حداقل موجودی {rules.min_balance_for_verification.toLocaleString('fa-IR')} تومان و کارمزد{' '}
          {rules.verification_fee.toLocaleString('fa-IR')} تومان برای هر احراز لازم است.
        </p>
      ) : (
        <ul className="space-y-2">
          {accounts.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-soft px-3 py-2.5 text-sm"
            >
              <div className="min-w-0">
                {account.masked_card_number ? (
                  <p className="font-medium text-text" dir="ltr">
                    {account.masked_card_number}
                  </p>
                ) : null}
                {account.masked_iban ? (
                  <p className="text-text-muted" dir="ltr">
                    {account.masked_iban}
                  </p>
                ) : null}
                {account.bank_name ? <p className="text-xs text-text-muted">{account.bank_name}</p> : null}
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-danger hover:bg-danger/10"
                disabled={deletePending}
                aria-label="حذف کارت"
                onClick={() => {
                  const ok = window.confirm(
                    'آیا از حذف این کارت/شبا مطمئن هستید؟ برای برداشت مجدد باید دوباره احراز شود.',
                  );
                  if (!ok) return;

                  setDeletingId(account.id);
                  startDelete(async () => {
                    const res = await deleteVerifiedBankAccountAction(account.id);
                    setDeletingId(null);
                    if (res.error) {
                      showToast({ tone: 'error', title: 'حذف ناموفق', message: res.error });
                      return;
                    }
                    showToast({ tone: 'success', title: 'حذف شد', message: res.success ?? 'کارت حذف شد.' });
                    window.setTimeout(() => window.location.reload(), 500);
                  });
                }}
              >
                {deletePending && deletingId === account.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showAddForm ? (
        <AddBankAccountForm rules={rules} payableAmount={payableAmount} onSuccess={() => setShowAddForm(false)} />
      ) : null}
    </div>
  );
}

function AddBankAccountForm({
  rules,
  payableAmount,
  onSuccess,
}: {
  rules: BankAccountRules;
  payableAmount: number;
  onSuccess: () => void;
}) {
  const [state, action] = useActionState(addVerifiedBankAccountAction, INITIAL);

  usePanelFormFeedback(state, {
    successTitle: 'کارت تأیید شد',
    errorTitle: 'احراز ناموفق',
  });

  useEffect(() => {
    if (!state.success) return;
    onSuccess();
    const timer = window.setTimeout(() => window.location.reload(), 700);
    return () => window.clearTimeout(timer);
  }, [onSuccess, state.success]);

  const canVerify =
    payableAmount >= rules.min_balance_for_verification && payableAmount >= rules.verification_fee;

  return (
    <form action={action} className="panel-form-grid rounded-xl border border-border p-4">
      <p className="panel-form-grid__full text-sm leading-relaxed text-text-muted">
        اطلاعات هویتی تأییدشده شما (کد ملی و تاریخ تولد) به‌صورت خودکار به سرویس شاهکار ارسال می‌شود.
        کارمزد احراز: <span className="font-semibold text-text">{rules.verification_fee.toLocaleString('fa-IR')} تومان</span>
      </p>

      {!canVerify ? (
        <p className="panel-form-grid__full rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-text-muted">
          برای احراز کارت، حداقل {rules.min_balance_for_verification.toLocaleString('fa-IR')} تومان موجودی قابل برداشت لازم است.
        </p>
      ) : null}

      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="card_number">
          شماره کارت (۱۶ رقم)
        </label>
        <input
          id="card_number"
          name="card_number"
          inputMode="numeric"
          maxLength={19}
          placeholder="6037 **** **** ****"
          className="field-input"
          dir="ltr"
        />
      </div>

      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="iban">
          شماره شبا (اختیاری — اگر فقط شبا دارید)
        </label>
        <input
          id="iban"
          name="iban"
          placeholder="IR..."
          className="field-input"
          dir="ltr"
        />
      </div>

      <div>
        <label className="field-label" htmlFor="holder_name">
          نام صاحب کارت (اختیاری)
        </label>
        <input id="holder_name" name="holder_name" className="field-input" />
      </div>

      <button type="submit" className="btn btn-primary panel-form-grid__full" disabled={!canVerify}>
        تأیید و ثبت با شاهکار
      </button>
    </form>
  );
}
