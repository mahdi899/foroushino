import { AdminPage } from '../../ui';
import { can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import type { TicketTechActorLevel } from '@/lib/admin/academyTypes';
import { TicketsHubClient } from './TicketsHubClient';

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

export default async function TicketsPage() {
  const user = await getCurrentUser();
  const showTechnicalQueue = can(user, 'tickets.technical');
  const techActorLevel = techActorLevelFor(user);
  const { canReplyToUser, mustUseInternal } = ticketReplyCaps(user);

  return (
    <AdminPage title="مرکز تیکت" desc="ارسال تیکت، گفت‌وگو با دانشجوها و گزارش پشتیبانی" icon="LifeBuoy">
      <TicketsHubClient
        canViewStudents={can(user, 'students.view')}
        canSearchStudents={can(user, 'students.view')}
        showTechnicalQueue={showTechnicalQueue}
        showResolvedForSupport={!showTechnicalQueue && can(user, 'tickets.view')}
        techActorLevel={techActorLevel}
        canReplyToUser={canReplyToUser}
        mustUseInternal={mustUseInternal}
      />
    </AdminPage>
  );
}
