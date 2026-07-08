'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCheck, ExternalLink, Loader2, Send } from 'lucide-react';
import { fetchTicketDetail, replyToTicket, updateTicketStatus } from '../actions';
import { useOperatorQueueAlert } from '../../OperatorQueueAlertContext';
import { Badge } from '../../ui';
import { TICKET_STATUS_LABELS, formatDateTime, type AdminTicketDetail } from '@/lib/admin/academyTypes';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning'> = {
  closed: 'default',
  answered: 'success',
  open: 'warning',
  waiting_user: 'warning',
};

function dayLabel(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'امروز';
  if (date.toDateString() === yesterday.toDateString()) return 'دیروز';
  return date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
}

function sameDay(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  return a.slice(0, 10) === b.slice(0, 10);
}

export function TicketChatPanel({ ticket: initial, compact = false }: { ticket: AdminTicketDetail; compact?: boolean }) {
  const router = useRouter();
  const { refreshPendingCount } = useOperatorQueueAlert();
  const [ticket, setTicket] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTicket(initial);
  }, [initial]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages.length]);

  useEffect(() => {
    const id = window.setInterval(async () => {
      if (document.hidden) return;
      const res = await fetchTicketDetail(ticket.id);
      if (res.ok && res.data) setTicket(res.data);
    }, 10_000);
    return () => window.clearInterval(id);
  }, [ticket.id]);

  async function onReply(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setPending(true);
    setError('');
    const res = await replyToTicket(ticket.id, message.trim());
    setPending(false);
    if (!res.ok) {
      setError(res.error ?? 'ارسال پاسخ ناموفق بود.');
      return;
    }
    setMessage('');
    const refreshed = await fetchTicketDetail(ticket.id);
    if (refreshed.ok && refreshed.data) setTicket(refreshed.data);
    void refreshPendingCount();
    router.refresh();
  }

  async function onStatusChange(status: string) {
    setStatusPending(true);
    const res = await updateTicketStatus(ticket.id, status);
    setStatusPending(false);
    if (res.ok) {
      setTicket((current) => ({ ...current, status: status as AdminTicketDetail['status'] }));
      void refreshPendingCount();
      router.refresh();
    }
  }

  return (
    <div className={`flex min-h-0 flex-col overflow-hidden bg-bg ${compact ? 'h-[38rem]' : 'h-[calc(100vh-12rem)]'}`}>
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border bg-surface px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-small font-bold text-primary-dark">{ticket.subject}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-muted">
            <span>{ticket.user_name ?? 'دانشجو'}</span>
            {ticket.user_mobile && <span dir="ltr">{ticket.user_mobile}</span>}
            <Link href={`/admin/academy/students/${ticket.user_id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
              پروفایل
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
          <select className="field-input py-1 text-caption" value={ticket.status} disabled={statusPending} onChange={(e) => void onStatusChange(e.target.value)}>
            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {ticket.messages.map((m, index) => {
            const prev = ticket.messages[index - 1];
            const showDay = index === 0 || !sameDay(m.created_at, prev?.created_at ?? null);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-2 flex items-center gap-2 text-caption text-text-muted">
                    <div className="h-px flex-1 bg-border" />
                    <span>{dayLabel(m.created_at)}</span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className={`flex flex-col ${m.is_admin_reply ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-small shadow-sm ${m.is_admin_reply ? 'rounded-bl-md bg-accent text-white' : 'rounded-br-md bg-surface text-text ring-1 ring-border'}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                    {m.has_attachment && <p className="mt-2 text-caption opacity-80">پیوست دارد</p>}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-caption text-text-muted">
                    {m.sender_name && <span>{m.sender_name}</span>}
                    <span>{formatDateTime(m.created_at)}</span>
                    {m.is_admin_reply && <CheckCheck className="h-3 w-3 text-accent" />}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={endRef} />
        </div>
      </div>

      {ticket.status === 'closed' ? (
        <div className="shrink-0 border-t border-border bg-surface p-3 text-center text-caption text-text-muted">
          این تیکت بسته شده است.
        </div>
      ) : (
        <form onSubmit={onReply} className="shrink-0 border-t border-border bg-surface p-3">
          {error && <p className="mb-2 text-caption text-error">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={2}
              className="field-input min-h-11 flex-1 resize-none"
              placeholder="پاسخ... Enter برای ارسال"
              disabled={pending}
            />
            <button type="submit" disabled={pending || !message.trim()} className="btn btn-primary h-11 w-11 shrink-0 p-0" aria-label="ارسال">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
