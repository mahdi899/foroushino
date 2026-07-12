import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getOrder } from '@/lib/admin/commerceData';
import { OrderDetailForm, OrderStatusBadge } from '../OrderDetailForm';
import { PAYMENT_STATUS_LABELS } from '@/lib/admin/commerceTypes';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();

  return (
    <AdminPage
      title={`سفارش ${order.order_number}`}
      desc={`${order.customer_name} · ${order.product_title ?? 'بدون محصول'}`}
      backHref="/admin/commerce/orders"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-caption text-text-muted">
            {PAYMENT_STATUS_LABELS[order.payment_status] ?? order.payment_status}
          </span>
        </div>
      }
    >
      <OrderDetailForm order={order} />
    </AdminPage>
  );
}
