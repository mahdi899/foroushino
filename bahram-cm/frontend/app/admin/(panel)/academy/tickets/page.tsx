import { AdminPage } from '../../ui';
import { TicketsHubClient } from './TicketsHubClient';

export const dynamic = 'force-dynamic';

export default function TicketsPage() {
  return (
    <AdminPage title="مرکز تیکت" desc="ارسال تیکت، گفت‌وگو با دانشجوها و گزارش پشتیبانی" icon="LifeBuoy">
      <TicketsHubClient />
    </AdminPage>
  );
}
