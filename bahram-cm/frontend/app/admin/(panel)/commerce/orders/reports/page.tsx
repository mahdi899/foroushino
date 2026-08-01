import { AdminPage } from '../../../ui';
import { OrdersReportsClient } from './OrdersReportsClient';

export const dynamic = 'force-dynamic';

function parsePeriodDays(raw?: string): number | 'all' {
  if (!raw || raw === 'all') return 'all';
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 30;
  return Math.min(365, Math.round(n));
}

export default async function OrdersReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const periodDays = parsePeriodDays(sp.days);

  return (
    <AdminPage
      title="گزارش سفارشات"
      desc="تحلیل نموداری فروش، وضعیت پرداخت و روند درآمد"
      icon="BarChart3"
      headerVariant="commerce"
    >
      <OrdersReportsClient periodDays={periodDays} />
    </AdminPage>
  );
}
