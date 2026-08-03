import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getTicket } from '@/lib/admin/academyData';
import { can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import type { TicketTechActorLevel } from '@/lib/admin/academyTypes';
import { TicketChatPanel } from '../TicketChatPanel';

export const dynamic = 'force-dynamic';

function techActorLevelFor(user: Awaited<ReturnType<typeof getCurrentUser>>): TicketTechActorLevel | null {
  if (!user) return null;
  if (isSuperAdmin(user)) return 'super_admin';
  if (user.roles.includes('tech-manager')) return 'tech_manager';
  if (user.roles.includes('tech-support')) return 'tech_support';
  return null;
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(Number(id));
  if (!ticket) notFound();

  const user = await getCurrentUser();

  return (
    <AdminPage title={`تیکت #${ticket.id}`} desc={ticket.subject} backHref="/admin/academy/tickets">
      <div className="admin-ticket-chat-shell overflow-hidden rounded-xl bg-surface">
        <TicketChatPanel
          ticket={ticket}
          canViewStudents={can(user, 'students.view')}
          techActorLevel={techActorLevelFor(user)}
        />
      </div>
    </AdminPage>
  );
}
