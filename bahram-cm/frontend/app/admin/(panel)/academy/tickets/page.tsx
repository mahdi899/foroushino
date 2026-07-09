import { AdminPage } from '../../ui';
import { getTickets } from '@/lib/admin/academyData';
import { TicketsHubClient } from './TicketsHubClient';

export const dynamic = 'force-dynamic';

export default async function TicketsPage() {
  const { items: tickets, error } = await getTickets();

  return (
    <AdminPage title="مرکز تیکت" desc="ارسال تیکت، گفت‌وگو با دانشجوها و گزارش پشتیبانی" icon="LifeBuoy">
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}
      <TicketsHubClient initialTickets={tickets} />
    </AdminPage>
  );
}
