import { AdminPage, StatCard } from '../../ui';
import { loadPaymentSettingsAction } from '../actions';
import { PaymentSettingsForm } from './PaymentSettingsForm';

export const dynamic = 'force-dynamic';

export default async function PaymentSettingsPage() {
  const data = await loadPaymentSettingsAction();

  return (
    <AdminPage
      title="تنظیمات پرداخت"
      desc="درگاه زرین‌پال، آدرس بازگشت و قالب تراکنش"
      icon="CreditCard"
      headerVariant="commerce"
    >
      <div className="admin-content-list">
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard
            label="وضعیت درگاه"
            value={data?.is_active ? 'فعال' : 'غیرفعال'}
            icon="CreditCard"
            tone={data?.is_active ? 'green' : 'amber'}
          />
          <StatCard
            label="کد پذیرنده"
            value={data?.has_merchant_id ? 'تنظیم شده' : 'ثبت نشده'}
            icon="Shield"
            tone={data?.has_merchant_id ? 'teal' : 'amber'}
          />
          <StatCard
            label="حالت آزمایشی"
            value={data?.sandbox_mode ? 'Sandbox' : 'Production'}
            icon="Zap"
            tone={data?.sandbox_mode ? 'gold' : 'blue'}
            hint={data?.currency === 'IRR' ? 'واحد: ریال' : 'واحد: تومان'}
          />
        </div>

        <PaymentSettingsForm initial={data} />
      </div>
    </AdminPage>
  );
}
