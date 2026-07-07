'use client';

import { useActionState } from 'react';
import { createTicketAction, type SimpleFormState } from '@/lib/student/panelActions';

const INITIAL: SimpleFormState = {};

export function NewTicketForm() {
  const [state, action] = useActionState(createTicketAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label className="field-label" htmlFor="subject">موضوع</label>
        <input id="subject" name="subject" className="field-input" required />
      </div>
      <div>
        <label className="field-label" htmlFor="department">بخش مربوطه (اختیاری)</label>
        <select id="department" name="department" className="field-input">
          <option value="">عمومی</option>
          <option value="technical">فنی</option>
          <option value="financial">مالی</option>
          <option value="course">دوره</option>
        </select>
      </div>
      <div>
        <label className="field-label" htmlFor="message">پیام</label>
        <textarea id="message" name="message" rows={5} className="field-input" required />
      </div>
      {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
      <button type="submit" className="btn btn-primary">ارسال تیکت</button>
    </form>
  );
}
