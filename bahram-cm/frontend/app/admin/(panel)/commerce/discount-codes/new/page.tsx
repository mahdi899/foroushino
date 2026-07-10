import { AdminPage } from '../../../ui';
import { DiscountCodeForm } from './DiscountCodeForm';
import { getProducts } from '@/lib/admin/commerceData';

export const dynamic = 'force-dynamic';

export default async function NewDiscountCodePage() {
  const { items: products } = await getProducts();

  return (
    <AdminPage
      title="کد تخفیف جدید"
      desc="تعریف کوپن تخفیف با محدودیت‌های دلخواه"
      icon="TicketPercent"
      headerVariant="commerce"
    >
      <DiscountCodeForm products={products} />
    </AdminPage>
  );
}
