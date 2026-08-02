import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getTicket } from '@/lib/admin/academyData';
import { can, getCurrentUser } from '@/lib/auth/session';
import { TicketChatPanel } from '../TicketChatPanel';

export const dynamic = 'force-dynamic';

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(Number(id));
  if (!ticket) notFound();

  const user = await getCurrentUser();

  return (
    <AdminPage title={`تیکت #${ticket.id}`} desc={ticket.subject} backHref="/admin/academy/tickets">
      <div className="admin-ticket-chat-shell overflow-hidden rounded-xl bg-surface">
        <TicketChatPanel ticket={ticket} canViewStudents={can(user, 'students.view')} />
      </div>
    </AdminPage>
  );
}
