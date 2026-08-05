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

function ticketReplyCaps(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  if (!user) return { canReplyToUser: false, mustUseInternal: true };
  const roles = user.roles;
  const isTechOnly =
    (roles.includes('tech-support') || roles.includes('tech-manager')) && !roles.includes('support');
  return {
    canReplyToUser: !isTechOnly,
    mustUseInternal: isTechOnly,
  };
}

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ticket = await getTicket(Number(id));
  if (!ticket) notFound();

  const user = await getCurrentUser();
  const { canReplyToUser, mustUseInternal } = ticketReplyCaps(user);

  return (
    <AdminPage title={`تیکت #${ticket.id}`} desc={ticket.subject} backHref="/admin/academy/tickets">
      <div className="admin-ticket-chat-shell overflow-hidden rounded-xl bg-surface">
        <TicketChatPanel
          ticket={ticket}
          canViewStudents={can(user, 'students.view')}
          techActorLevel={techActorLevelFor(user)}
          canReplyToUser={canReplyToUser}
          mustUseInternal={mustUseInternal}
        />
      </div>
    </AdminPage>
  );
}
