'use client';

import { useActionState } from 'react';
import { replyTicketAction } from '@/lib/student/panelActions';
import type { SimpleFormState } from '@/lib/student/panelFormUtils';
import { usePanelFormFeedback } from '@/lib/student/usePanelFormFeedback';

const INITIAL: SimpleFormState = {};

export function TicketReplyForm({ ticketId }: { ticketId: number }) {
  const boundAction = replyTicketAction.bind(null, ticketId);
  const [state, action] = useActionState(boundAction, INITIAL);

  usePanelFormFeedback(state, {
    successTitle: 'پاسخ ارسال شد',
    errorTitle: 'ارسال ناموفق',
  });

  return (
    <form action={action} className="flex flex-col gap-3">
      <textarea name="message" rows={3} placeholder="پاسخ خود را بنویسید..." className="field-input" required />
      <button type="submit" className="btn btn-primary self-start">ارسال پاسخ</button>
    </form>
  );
}
