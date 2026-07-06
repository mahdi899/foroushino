import { AdminPage, EditLink, Table } from '../../ui';
import { formatToman, getOrders } from '@/lib/admin/commerceData';
import { OrderStatusBadge } from './OrderDetailForm';
import { PAYMENT_STATUS_LABELS } from '@/lib/admin/commerceTypes';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const { items: orders, error } = await getOrders();

  return (
    <AdminPage title="سفارش‌ها" desc="پیگیری پرداخت و تحویل سفارش‌ها">
      {error && (
        <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
          {error}
        </div>
      )}
      {orders.length > 0 ? (
        <Table head={['شماره', 'محصول', 'مشتری', 'مبلغ', 'وضعیت', 'پرداخت', 'تاریخ', 'عملیات']}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-surface-soft/40">
              <td className="whitespace-nowrap px-4 py-3 font-mono text-caption" dir="ltr">{o.order_number}</td>
              <td className="px-4 py-3">{o.product_title ?? '—'}</td>
              <td className="px-4 py-3">
                <p>{o.customer_name}</p>
                <p className="text-caption text-text-muted" dir="ltr">{o.customer_phone}</p>
              </td>
              <td className="whitespace-nowrap px-4 py-3">{formatToman(o.final_amount)}</td>
              <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
              <td className="px-4 py-3 text-caption">{PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}</td>
              <td className="whitespace-nowrap px-4 py-3 text-caption">
                {o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—'}
              </td>
              <td className="px-4 py-3">
                <EditLink href={`/admin/commerce/orders/${o.id}`} />
              </td>
            </tr>
          ))}
        </Table>
      ) : (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">هنوز سفارشی ثبت نشده</p>
          <p className="mt-2 text-small text-text-muted">سفارش‌های پرداخت از سایت اینجا نمایش داده می‌شوند.</p>
        </div>
      )}
    </AdminPage>
  );
}
