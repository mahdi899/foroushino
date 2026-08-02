'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCheck, ExternalLink, Loader2, Send, Wrench } from 'lucide-react';
import { fetchTicketDetail, replyToTicket, updateTicketDepartment, updateTicketStatus } from '../actions';
import { useOperatorQueueAlert } from '../../OperatorQueueAlertContext';
import { Badge } from '../../ui';
import {
  TICKET_DEPARTMENT_LABELS,
  TICKET_STATUS_LABELS,
  formatDateTime,
  type AdminTicketDetail,
} from '@/lib/admin/academyTypes';

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

function departmentLabel(department: string | null): string {
  if (!department) return TICKET_DEPARTMENT_LABELS.general;
  return TICKET_DEPARTMENT_LABELS[department] ?? department;
}

export function TicketChatPanel({
  ticket: initial,
  compact = false,
  canViewStudents = false,
}: {
  ticket: AdminTicketDetail;
  compact?: boolean;
  canViewStudents?: boolean;
}) {
  const router = useRouter();
  const { refreshPendingCount } = useOperatorQueueAlert();
  const [ticket, setTicket] = useState(initial);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [departmentPending, setDepartmentPending] = useState(false);
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

  async function markNeedsTechnicalReview() {
    setDepartmentPending(true);
    setError('');
    const res = await updateTicketDepartment(ticket.id, 'technical');
    setDepartmentPending(false);
    if (!res.ok) {
      setError(res.error ?? 'انتقال به پشتیبانی فنی ناموفق بود.');
      return;
    }
    setTicket((current) => ({ ...current, department: 'technical' }));
    router.refresh();
  }

  const isTechnical = ticket.department === 'technical';

  return (
    <div
      className={`admin-ticket-chat flex min-h-0 flex-col overflow-hidden bg-bg ${
        compact ? 'h-full min-h-[min(68dvh,32rem)]' : 'h-[calc(100dvh-12rem)]'
      }`}
    >
      <div className="admin-ticket-chat__header">
        <div className="admin-ticket-chat__header-meta min-w-0">
          <h2 className="text-small font-bold text-primary-dark">{ticket.subject}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-caption text-text-muted">
            <span>{ticket.user_name ?? 'دانشجو'}</span>
            {ticket.user_mobile && <span dir="ltr">{ticket.user_mobile}</span>}
            {canViewStudents ? (
              <Link href={`/admin/academy/students/${ticket.user_id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                پروفایل
                <ExternalLink className="h-3 w-3" />
              </Link>
            ) : null}
          </div>
        </div>
        <div className="admin-ticket-chat__header-actions">
          <Badge tone={isTechnical ? 'warning' : 'default'}>{departmentLabel(ticket.department)}</Badge>
          <Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
          <select
            className="field-input admin-ticket-chat__control py-1 text-caption"
            value={ticket.status}
            disabled={statusPending}
            onChange={(e) => void onStatusChange(e.target.value)}
          >
            {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          {!isTechnical ? (
            <button
              type="button"
              className="btn btn-secondary admin-ticket-chat__tech-btn inline-flex items-center justify-center gap-1.5 py-1.5 text-caption"
              disabled={departmentPending}
              onClick={() => void markNeedsTechnicalReview()}
            >
              {departmentPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
              نیاز به بررسی پشتیبانی فنی دارد
            </button>
          ) : null}
        </div>
      </div>

      <div className="admin-ticket-chat__messages flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {ticket.messages.map((m, index) => {
            const prev = ticket.messages[index - 1];
            const showDay = index === 0 || !sameDay(m.created_at, prev?.created_at ?? null);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-2 flex items-center gap-2 text-caption text-text-muted">
                    <div className="h-px flex-1 bg-border/60" />
                    <span>{dayLabel(m.created_at)}</span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}
                <div className={`flex flex-col ${m.is_admin_reply ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[min(82%,28rem)] rounded-2xl px-4 py-3 text-small ${
                      m.is_admin_reply
                        ? 'rounded-bl-md bg-accent text-white'
                        : 'rounded-br-md bg-surface-soft text-text'
                    }`}
                  >
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
        <div className="admin-ticket-chat__footer shrink-0 p-3 text-center text-caption text-text-muted">
          این تیکت بسته شده است.
        </div>
      ) : (
        <form onSubmit={onReply} className="admin-ticket-chat__reply shrink-0 p-3">
          {error && <p className="mb-2 text-caption text-error">{error}</p>}
          <div className="admin-ticket-chat__composer flex items-end gap-2">
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
              className="field-input admin-ticket-chat__control min-h-11 flex-1 resize-none"
              placeholder="پاسخ... Enter برای ارسال"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !message.trim()}
              className="btn btn-primary inline-flex h-11 shrink-0 items-center gap-1.5 px-3.5 sm:px-4"
              aria-label="ارسال پاسخ"
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              <span className="hidden sm:inline">ارسال</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
