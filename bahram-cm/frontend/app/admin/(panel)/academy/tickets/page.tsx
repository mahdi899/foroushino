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

export default async function TicketsPage() {
  const user = await getCurrentUser();
  const showTechnicalQueue = can(user, 'tickets.technical');
  const techActorLevel = techActorLevelFor(user);

  return (
    <AdminPage title="مرکز تیکت" desc="ارسال تیکت، گفت‌وگو با دانشجوها و گزارش پشتیبانی" icon="LifeBuoy">
      <TicketsHubClient
        canViewStudents={can(user, 'students.view')}
        canSearchStudents={can(user, 'students.view')}
        showTechnicalQueue={showTechnicalQueue}
        showResolvedForSupport={!showTechnicalQueue && can(user, 'tickets.view')}
        techActorLevel={techActorLevel}
      />
    </AdminPage>
  );
}
