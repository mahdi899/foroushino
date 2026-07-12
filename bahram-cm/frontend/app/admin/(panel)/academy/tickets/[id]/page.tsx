import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getTicket } from '@/lib/admin/academyData';
import { TicketChatPanel } from '../TicketChatPanel';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(Number(id));
  if (!ticket) notFound();

  return (
    <AdminPage title={`تیکت #${ticket.id}`} desc={ticket.subject} backHref="/admin/academy/tickets">
      <div className="overflow-hidden rounded-xl border border-border">
        <TicketChatPanel ticket={ticket} />
      </div>
    </AdminPage>
  );
}
