import { AdminPage } from '../../ui';
import { loadPaymentSettingsAction } from '../actions';
import { PaymentSettingsForm } from './PaymentSettingsForm';

export const dynamic = 'force-dynamic';

export default async function PaymentSettingsPage() {
  const data = await loadPaymentSettingsAction();

  return (
    <AdminPage title="تنظیمات پرداخت" desc="درگاه زرین‌پال و قالب تراکنش">
      <PaymentSettingsForm initial={data} />
    </AdminPage>
  );
}
