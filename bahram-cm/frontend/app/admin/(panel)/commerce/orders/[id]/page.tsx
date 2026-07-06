import { notFound } from 'next/navigation';
import { AdminPage } from '../../../ui';
import { getOrder } from '@/lib/admin/commerceData';
import { OrderDetailForm } from '../OrderDetailForm';

export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(Number(id));
  if (!order) notFound();

  return (
    <AdminPage title={`سفارش ${order.order_number}`} desc="جزئیات و مدیریت وضعیت سفارش">
      <OrderDetailForm order={order} />
    </AdminPage>
  );
}
