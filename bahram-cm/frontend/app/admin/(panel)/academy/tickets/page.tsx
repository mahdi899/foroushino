import { AdminPage } from '../../ui';
import { can, getCurrentUser, isSuperAdmin } from '@/lib/auth/session';
import { TicketsHubClient } from './TicketsHubClient';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const user = await getCurrentUser();

  return (
    <AdminPage title="مرکز تیکت" desc="ارسال تیکت، گفت‌وگو با دانشجوها و گزارش پشتیبانی" icon="LifeBuoy">
      <TicketsHubClient
        canViewStudents={can(user, 'students.view')}
        canSearchStudents={can(user, 'students.view')}
        showTechnicalQueue={isSuperAdmin(user)}
      />
    </AdminPage>
  );
}
