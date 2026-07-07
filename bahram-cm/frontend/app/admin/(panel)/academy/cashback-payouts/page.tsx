import { AdminPage, Table } from '../../ui';
import { getCashbackPayouts } from '@/lib/admin/academyData';
import { PayoutRow } from './PayoutRow';

export const dynamic = 'force-dynamic';

export default async function CashbackPayoutsPage() {
  const { items: payouts, error } = await getCashbackPayouts();

  return (
    <AdminPage title="واریز کش‌بک" desc="بررسی و تسویه درخواست‌های کش‌بک باشگاه مشتریان — شماره کارت کامل فقط با نمایش دستی و ثبت‌شده در لاگ">
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">{error}</div>
      )}

      {payouts.length > 0 ? (
        <Table head={['دانشجو', 'مبلغ', 'شماره کارت', 'وضعیت', 'تاریخ درخواست']}>
          {payouts.map((p) => (
            <PayoutRow key={p.id} payout={p} />
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">درخواست واریزی ثبت نشده</p>
        </div>
      )}
    </AdminPage>
  );
}
