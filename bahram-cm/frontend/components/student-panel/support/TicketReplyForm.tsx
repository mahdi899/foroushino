'use client';

import { useActionState } from 'react';
import { replyTicketAction, type SimpleFormState } from '@/lib/student/panelActions';

const INITIAL: SimpleFormState = {};

export function TicketReplyForm({ ticketId }: { ticketId: number }) {
  const boundAction = replyTicketAction.bind(null, ticketId);
  const [state, action] = useActionState(boundAction, INITIAL);

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea name="message" rows={3} placeholder="پاسخ خود را بنویسید..." className="field-input" required />
      {state.error ? <p className="text-sm text-error">{state.error}</p> : null}
      <button type="submit" className="btn btn-primary self-start">ارسال پاسخ</button>
    </form>
  );
}
