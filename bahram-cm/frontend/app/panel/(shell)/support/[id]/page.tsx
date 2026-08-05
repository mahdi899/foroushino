import type { Metadata } from 'next';
import { TicketReplyForm } from '@/components/student-panel/support/TicketReplyForm';
import { panelStudentFetch } from '@/lib/student/panelServer';

export const metadata: Metadata = { title: 'جزئیات تیکت | پنل کاربری', robots: { index: false, follow: false } };

interface TicketMessage {
  id: number;
  message: string;
  is_admin_reply: boolean;
  created_at: string | null;
}

interface TicketDetail {
  id: number;
  subject: string;
  status: string;
  messages: TicketMessage[];
}

const STATUS_LABELS: Record<string, string> = {
  open: 'باز',
  in_review: 'در حال بررسی',
  answered: 'پاسخ داده‌شده',
  waiting_user: 'در انتظار شما',
  closed: 'بسته‌شده',
};

const STATUS_BADGES: Record<string, string> = {
  open: 'badge-warning',
  in_review: 'badge-warning',
  answered: 'badge-success',
  waiting_user: 'badge-warning',
  closed: 'badge-neutral',
};

export default async function PanelTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: ticket } = await panelStudentFetch<{ data: TicketDetail }>(`/tickets/${id}`);
  const statusLabel = STATUS_LABELS[ticket.status] ?? ticket.status;
  const statusBadge = STATUS_BADGES[ticket.status] ?? 'badge-neutral';

  return (
    <div className="panel-page-inner panel-page-inner--md flex flex-col gap-6">
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-caption text-text-muted">تیکت #{ticket.id}</p>
            <h1 className="mt-1 text-lg font-bold text-text">{ticket.subject}</h1>
          </div>
          <span className={`badge ${statusBadge}`}>{statusLabel}</span>
        </div>
        {ticket.status === 'in_review' ? (
          <p className="mt-3 rounded-lg bg-warning/10 px-3 py-2 text-sm text-text">
            تیم پشتیبانی در حال بررسی مشکل شماست. به‌زودی نتیجه را اعلام می‌کنیم.
          </p>
        ) : null}
      </div>

      <div className="card flex flex-col gap-4 p-6">
        {ticket.messages.map((message) => (
          <div
            key={message.id}
            className={`panel-ticket-bubble ${message.is_admin_reply ? 'panel-ticket-bubble--support' : 'panel-ticket-bubble--mine'}`}
          >
            {message.message}
          </div>
        ))}
      </div>

      {ticket.status !== 'closed' ? (
        <div className="card p-6">
          <TicketReplyForm ticketId={ticket.id} />
        </div>
      ) : (
        <p className="text-center text-sm text-text-muted">این تیکت بسته شده است.</p>
      )}
    </div>
  );
}
