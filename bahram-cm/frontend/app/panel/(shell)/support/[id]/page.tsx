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

export default async function PanelTicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: ticket } = await panelStudentFetch<{ data: TicketDetail }>(`/tickets/${id}`);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="card p-6">
        <h1 className="text-lg font-bold text-text">{ticket.subject}</h1>
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
