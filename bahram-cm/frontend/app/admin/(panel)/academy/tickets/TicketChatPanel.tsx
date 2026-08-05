'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowUpRight,
  CheckCheck,
  CheckCircle2,
  ExternalLink,
  Lock,
  Loader2,
  Send,
  Wrench,
} from 'lucide-react';
import {
  fetchTicketDetail,
  replyToTicket,
  updateTicketDepartment,
  updateTicketStatus,
  updateTicketTechEscalation,
} from '../actions';
import { useOperatorQueueAlert } from '../../OperatorQueueAlertContext';
import { Badge } from '../../ui';
import {
  TICKET_DEPARTMENT_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_TECH_ESCALATION_LABELS,
  formatDateTime,
  type AdminTicketDetail,
  type TicketTechActorLevel,
  type TicketTechEscalation,
} from '@/lib/admin/academyTypes';

const STATUS_TONE: Record<string, 'default' | 'success' | 'warning'> = {
  closed: 'default',
  answered: 'success',
  open: 'warning',
  in_review: 'warning',
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

function escalationLabel(value: string | null | undefined): string {
  if (!value) return '';
  return TICKET_TECH_ESCALATION_LABELS[value] ?? value;
}

export function TicketChatPanel({
  ticket: initial,
  compact = false,
  canViewStudents = false,
  techActorLevel = null,
  canReplyToUser = true,
  mustUseInternal = false,
  onTechEscalationChanged,
}: {
  ticket: AdminTicketDetail;
  compact?: boolean;
  canViewStudents?: boolean;
  techActorLevel?: TicketTechActorLevel | null;
  /** false for tech-support / tech-manager — they may only post internal notes */
  canReplyToUser?: boolean;
  mustUseInternal?: boolean;
  onTechEscalationChanged?: () => void;
}) {
  const router = useRouter();
  const { refreshPendingCount } = useOperatorQueueAlert();
  const [ticket, setTicket] = useState(initial);
  const [message, setMessage] = useState('');
  const [sendInternal, setSendInternal] = useState(mustUseInternal);
  const [pending, setPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  const [departmentPending, setDepartmentPending] = useState(false);
  const [escalationPending, setEscalationPending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const replyToUserAllowed = ticket.can_reply_to_user ?? canReplyToUser;
  const internalOnly = ticket.must_use_internal ?? mustUseInternal;
  const composingInternal = internalOnly || sendInternal;

  useEffect(() => {
    setTicket(initial);
  }, [initial]);

  useEffect(() => {
    if (internalOnly) setSendInternal(true);
  }, [internalOnly, ticket.id]);

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
    const res = await replyToTicket(ticket.id, message.trim(), { internal: composingInternal });
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
    const refreshed = await fetchTicketDetail(ticket.id);
    if (refreshed.ok && refreshed.data) setTicket(refreshed.data);
    else setTicket((current) => ({ ...current, department: 'technical', tech_escalation: 'tech_support' }));
    onTechEscalationChanged?.();
    router.refresh();
  }

  async function setTechEscalation(next: TicketTechEscalation) {
    setEscalationPending(true);
    setError('');
    const res = await updateTicketTechEscalation(ticket.id, next);
    setEscalationPending(false);
    if (!res.ok) {
      setError(res.error ?? 'به‌روزرسانی ارجاع فنی ناموفق بود.');
      return;
    }
    const refreshed = await fetchTicketDetail(ticket.id);
    if (refreshed.ok && refreshed.data) setTicket(refreshed.data);
    onTechEscalationChanged?.();
    router.refresh();
  }

  const isTechnical = ticket.department === 'technical';
  const escalation = ticket.tech_escalation;
  const isResolved = escalation === 'resolved';
  const canWorkTechnical = Boolean(techActorLevel);
  const canEscalateToManager =
    canWorkTechnical && techActorLevel !== null && ['tech_support', 'tech_manager', 'super_admin'].includes(techActorLevel) && escalation === 'tech_support';
  const canEscalateToSuper =
    canWorkTechnical && techActorLevel !== null && ['tech_manager', 'super_admin'].includes(techActorLevel) && (escalation === 'tech_manager' || escalation === 'tech_support');
  const canMarkResolved = canWorkTechnical && isTechnical && !isResolved;

  return (
    <div
      className={`admin-ticket-chat flex min-h-0 flex-col overflow-hidden bg-bg ${
        compact ? 'h-full min-h-[min(68dvh,32rem)]' : 'h-[calc(100dvh-12rem)]'
      }`}
    >
      <div className="admin-ticket-chat__header">
        <div className="admin-ticket-chat__header-top">
          <div className="admin-ticket-chat__header-meta min-w-0">
            <h2 className="admin-ticket-chat__title truncate text-small font-bold text-primary-dark">{ticket.subject}</h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
              <span className="font-medium text-text">تیکت #{ticket.id}</span>
              <span className="text-border">·</span>
              <span>{ticket.user_name ?? 'دانشجو'}</span>
              {ticket.user_mobile ? (
                <>
                  <span className="text-border">·</span>
                  <span dir="ltr">{ticket.user_mobile}</span>
                </>
              ) : null}
              {canViewStudents ? (
                <Link href={`/admin/academy/students/${ticket.user_id}`} className="inline-flex items-center gap-1 text-accent hover:underline">
                  پروفایل
                  <ExternalLink className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </div>
          <label className="admin-ticket-chat__status-field shrink-0">
            <span className="sr-only">وضعیت تیکت</span>
            <select
              className="admin-ticket-chat__status-select"
              value={ticket.status}
              disabled={statusPending}
              onChange={(e) => void onStatusChange(e.target.value)}
            >
              {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-ticket-chat__header-toolbar">
          <div className="admin-ticket-chat__badges">
            <Badge tone={isTechnical ? 'warning' : 'default'}>{departmentLabel(ticket.department)}</Badge>
            {isTechnical && escalation ? (
              <Badge tone={isResolved ? 'success' : 'warning'}>{escalationLabel(escalation)}</Badge>
            ) : null}
            <Badge tone={STATUS_TONE[ticket.status] ?? 'default'}>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
          </div>
          <div className="admin-ticket-chat__header-actions">
            {!isTechnical ? (
              <button
                type="button"
                className="btn btn-secondary admin-ticket-chat__tech-btn inline-flex items-center justify-center gap-1.5"
                disabled={departmentPending}
                onClick={() => void markNeedsTechnicalReview()}
              >
                {departmentPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                <span>بررسی فنی</span>
              </button>
            ) : null}
            {canMarkResolved ? (
              <button
                type="button"
                className="btn btn-primary admin-ticket-chat__tech-btn inline-flex items-center justify-center gap-1.5"
                disabled={escalationPending}
                onClick={() => void setTechEscalation('resolved')}
              >
                {escalationPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>حل شد</span>
              </button>
            ) : null}
            {canEscalateToManager ? (
              <button
                type="button"
                className="btn btn-secondary admin-ticket-chat__tech-btn inline-flex items-center justify-center gap-1.5"
                disabled={escalationPending}
                onClick={() => void setTechEscalation('tech_manager')}
              >
                {escalationPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                <span>مدیر فنی</span>
              </button>
            ) : null}
            {canEscalateToSuper ? (
              <button
                type="button"
                className="btn btn-secondary admin-ticket-chat__tech-btn inline-flex items-center justify-center gap-1.5"
                disabled={escalationPending}
                onClick={() => void setTechEscalation('super_admin')}
              >
                {escalationPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowUpRight className="h-3.5 w-3.5" />}
                <span>مدیر کل</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {isResolved ? (
        <div className="shrink-0 bg-success/10 px-4 py-2 text-caption text-success">
          مشکل فنی حل شده است
          {ticket.tech_resolver_name ? ` — توسط ${ticket.tech_resolver_name}` : ''}
          {ticket.tech_resolved_at ? ` (${formatDateTime(ticket.tech_resolved_at)})` : ''}.
          پشتیبانی می‌تواند نتیجه را به مخاطب اعلام کند.
        </div>
      ) : null}

      {internalOnly ? (
        <div className="shrink-0 border-b border-border/60 bg-surface-soft px-4 py-2 text-caption text-text-muted">
          شما فقط می‌توانید پیام داخلی برای پشتیبانی بفرستید؛ پاسخ نهایی به مخاطب را پشتیبانی ارسال می‌کند.
        </div>
      ) : null}

      <div className="admin-ticket-chat__messages flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
          {ticket.messages.map((m, index) => {
            const prev = ticket.messages[index - 1];
            const showDay = index === 0 || !sameDay(m.created_at, prev?.created_at ?? null);
            const isInternal = Boolean(m.is_internal);
            return (
              <div key={m.id}>
                {showDay && (
                  <div className="my-2 flex items-center gap-2 text-caption text-text-muted">
                    <div className="h-px flex-1 bg-border/60" />
                    <span>{dayLabel(m.created_at)}</span>
                    <div className="h-px flex-1 bg-border/60" />
                  </div>
                )}
                {isInternal ? (
                  <div className="flex flex-col items-stretch">
                    <div className="rounded-xl border border-dashed border-warning/50 bg-warning/10 px-4 py-3 text-small text-primary-dark">
                      <div className="mb-1.5 flex flex-wrap items-center gap-2 text-caption font-medium text-warning">
                        <Lock className="h-3.5 w-3.5" />
                        <span>پیام داخلی تیم</span>
                        <span className="text-text-muted">· تیکت #{ticket.id}</span>
                        {m.sender_role_label ? <span className="text-text-muted">· {m.sender_role_label}</span> : null}
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
                      {m.has_attachment && <p className="mt-2 text-caption opacity-80">پیوست دارد</p>}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-caption text-text-muted">
                      {m.sender_name && <span>{m.sender_name}</span>}
                      <span>{formatDateTime(m.created_at)}</span>
                    </div>
                  </div>
                ) : (
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
                      {m.sender_role_label && m.is_admin_reply ? <span>· {m.sender_role_label}</span> : null}
                      <span>{formatDateTime(m.created_at)}</span>
                      {m.is_admin_reply && <CheckCheck className="h-3 w-3 text-accent" />}
                    </div>
                  </div>
                )}
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
          {replyToUserAllowed && !internalOnly ? (
            <div className="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-lg px-3 py-1.5 text-caption transition ${
                  !sendInternal ? 'bg-accent text-white' : 'bg-surface-soft text-text-muted hover:bg-border/40'
                }`}
                onClick={() => setSendInternal(false)}
              >
                پاسخ به مخاطب
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-caption transition ${
                  sendInternal ? 'bg-warning text-white' : 'bg-surface-soft text-text-muted hover:bg-border/40'
                }`}
                onClick={() => setSendInternal(true)}
              >
                <Lock className="h-3.5 w-3.5" />
                پیام داخلی تیم
              </button>
            </div>
          ) : null}
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
              placeholder={
                composingInternal
                  ? 'پیام داخلی برای پشتیبانی / تیم فنی... Enter برای ارسال'
                  : 'پاسخ به مخاطب... Enter برای ارسال'
              }
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending || !message.trim()}
              className={`btn inline-flex h-11 shrink-0 items-center gap-1.5 px-3.5 sm:px-4 ${
                composingInternal ? 'btn-secondary' : 'btn-primary'
              }`}
              aria-label={composingInternal ? 'ارسال پیام داخلی' : 'ارسال پاسخ'}
            >
              {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : composingInternal ? <Lock className="h-5 w-5" /> : <Send className="h-5 w-5" />}
              <span className="hidden sm:inline">{composingInternal ? 'داخلی' : 'ارسال'}</span>
            </button>
          </div>
          {composingInternal ? (
            <p className="mt-1.5 text-caption text-text-muted">
              این پیام فقط برای تیم پشتیبانی دیده می‌شود و برای مخاطب ارسال نمی‌شود · تیکت #{ticket.id}
            </p>
          ) : null}
        </form>
      )}
    </div>
  );
}
