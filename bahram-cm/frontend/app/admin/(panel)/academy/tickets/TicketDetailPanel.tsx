'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Send } from 'lucide-react';
import { replyToTicket, updateTicketStatus } from '../actions';
import { useOperatorQueueAlert } from '../../OperatorQueueAlertContext';
import { TICKET_STATUS_LABELS, formatDateTime, type AdminTicketDetail } from '@/lib/admin/academyTypes';

export function TicketDetailPanel({ ticket }: { ticket: AdminTicketDetail }) {
  const router = useRouter();
  const { refreshPendingCount } = useOperatorQueueAlert();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState('');

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    setError('');
    const res = await replyToTicket(ticket.id, message);
    setPending(false);
    if (res.ok) {
      setMessage('');
      void refreshPendingCount();
      router.refresh();
    } else {
      setError(res.error ?? 'خطا');
    }
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-h3 font-bold text-primary-dark">{ticket.subject}</h2>
            <p className="text-caption text-text-muted">{ticket.user_name} — <span dir="ltr">{ticket.user_mobile}</span></p>
          </div>
          <select
            className="field-input"
            defaultValue={ticket.status}
            disabled={statusPending}
            onChange={(e) => {
              const value = e.target.value;
              setStatusPending(true);
              void updateTicketStatus(ticket.id, value).then(() => {
                setStatusPending(false);
                void refreshPendingCount();
                router.refresh();
              });
            }}
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {ticket.messages.map((m) => (
            <div
              key={m.id}
              className={`max-w-2xl rounded-lg p-3 text-small ${m.is_admin_reply ? 'mr-auto bg-accent-soft text-primary-dark' : 'ml-auto bg-surface-soft'}`}
            >
              <p>{m.message}</p>
              <p className="mt-1 text-caption text-text-muted">{formatDateTime(m.created_at)}</p>
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={onReply} className="card p-6">
        <h3 className="mb-3 text-small font-semibold text-primary-dark">پاسخ به تیکت</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="field-input mb-3 w-full"
          placeholder="متن پاسخ..."
        />
        {error && <p className="mb-2 text-small text-error">{error}</p>}
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          ارسال پاسخ
        </button>
      </form>
    </div>
  );
}
