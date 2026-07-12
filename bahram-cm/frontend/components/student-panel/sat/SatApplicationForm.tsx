'use client';

import { useActionState } from 'react';
import { submitSatApplicationAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';

const INITIAL: SimpleFormState = {};

export function SatApplicationForm({ mobile }: { mobile: string }) {
  const [state, action] = useActionState(submitSatApplicationAction, INITIAL);

  usePanelFormFeedback(state, {
    successTitle: 'درخواست ثبت شد',
    errorTitle: 'ثبت ناموفق',
  });

  return (
    <form action={action} className="panel-form-grid">
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="name">نام و نام خانوادگی</label>
        <input id="name" name="name" className="field-input" required />
      </div>
      <div>
        <label className="field-label">شماره موبایل</label>
        <input value={mobile} disabled className="field-input" dir="ltr" />
      </div>
      <div>
        <label className="field-label" htmlFor="city">شهر</label>
        <input id="city" name="city" className="field-input" />
      </div>
      <div>
        <label className="field-label" htmlFor="age">سن</label>
        <input id="age" name="age" type="number" min={10} max={120} className="field-input" />
      </div>
      <button type="submit" className="btn btn-primary panel-form-grid__full">ثبت درخواست</button>
    </form>
  );
}
