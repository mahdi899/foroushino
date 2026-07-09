'use client';

import { useActionState } from 'react';
import { submitSatApplicationAction, type SimpleFormState } from '@/lib/student/panelActions';

const INITIAL: SimpleFormState = {};

export function SatApplicationForm({ mobile }: { mobile: string }) {
  const [state, action] = useActionState(submitSatApplicationAction, INITIAL);

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
      {state.error ? <p className="panel-form-grid__full text-sm text-error">{state.error}</p> : null}
      {state.success ? <p className="panel-form-grid__full text-sm text-success">{state.success}</p> : null}
      <button type="submit" className="btn btn-primary panel-form-grid__full">ثبت درخواست</button>
    </form>
  );
}
