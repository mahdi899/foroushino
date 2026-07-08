import { AdminPage } from '../../../ui';
import { getOrderAnalytics } from '@/lib/admin/commerceData';
import { OrdersSectionNav } from '../OrdersSectionNav';
import { OrdersAnalyticsDashboard } from '../OrdersAnalyticsDashboard';

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
  const { data, error } = await getOrderAnalytics(periodDays);

  return (
    <AdminPage title="گزارش سفارشات" desc="تحلیل نموداری فروش، وضعیت پرداخت و روند درآمد">
      <OrdersSectionNav active="reports" />

      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {data ? <OrdersAnalyticsDashboard data={data} periodDays={periodDays} /> : null}
    </AdminPage>
  );
}
