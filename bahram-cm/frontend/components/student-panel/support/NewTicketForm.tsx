'use client';

import { useActionState } from 'react';
import { createTicketAction, type SimpleFormState } from '@/lib/student/panelActions';

const INITIAL: SimpleFormState = {};

export function NewTicketForm() {
  const [state, action] = useActionState(createTicketAction, INITIAL);

  return (
    <form action={action} className="panel-form-grid">
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="subject">موضوع</label>
        <input id="subject" name="subject" className="field-input" required />
      </div>
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="department">بخش مربوطه (اختیاری)</label>
        <select id="department" name="department" className="field-input">
          <option value="">عمومی</option>
          <option value="technical">فنی</option>
          <option value="financial">مالی</option>
          <option value="course">دوره</option>
        </select>
      </div>
      <div className="panel-form-grid__full">
        <label className="field-label" htmlFor="message">پیام</label>
        <textarea id="message" name="message" rows={5} className="field-input" required />
      </div>
      {state.error ? <p className="panel-form-grid__full text-sm text-error">{state.error}</p> : null}
      {state.success ? <p className="panel-form-grid__full text-sm text-success">{state.success}</p> : null}
      <button type="submit" className="btn btn-primary panel-form-grid__full">ارسال تیکت</button>
    </form>
  );
}
