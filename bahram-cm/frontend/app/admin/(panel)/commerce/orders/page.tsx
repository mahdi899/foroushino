import Link from 'next/link';
import { EditLink, Table } from '../../ui';
import { formatToman, getOrders } from '@/lib/admin/commerceData';
import { OrderStatusBadge } from './OrderDetailForm';
import { OrdersToolbar } from './OrdersToolbar';
import { PAYMENT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/admin/commerceTypes';

export const dynamic = 'force-dynamic';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    search?: string;
    status?: string;
    payment_status?: string;
    product_type?: string;
    page?: string;
  }>;
}) {
  const sp = await searchParams;
  const { items: orders, meta, error } = await getOrders({
    search: sp.search,
    status: sp.status,
    payment_status: sp.payment_status,
    product_type: sp.product_type,
    page: sp.page ? Number(sp.page) : undefined,
  });

  const hasFilters = Boolean(sp.search?.trim() || sp.status || sp.payment_status || sp.product_type);

  function ordersPageHref(page: number) {
    const params = new URLSearchParams();
    if (sp.search?.trim()) params.set('search', sp.search.trim());
    if (sp.status) params.set('status', sp.status);
    if (sp.payment_status) params.set('payment_status', sp.payment_status);
    if (sp.product_type) params.set('product_type', sp.product_type);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    return qs ? `/admin/commerce/orders?${qs}` : '/admin/commerce/orders';
  }

  return (
    <div>
      <div className="mb-5 border-b border-border pb-4 sm:mb-6 sm:pb-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 shrink-0 text-end">
            <h1 className="text-h3 font-extrabold text-primary-dark sm:text-h2">سفارش‌ها</h1>
            <p className="mt-1 text-caption text-text-muted sm:mt-1.5 sm:text-small">
              پیگیری پرداخت و تحویل سفارش‌ها
              {meta ? ` · ${meta.total.toLocaleString('fa-IR')} سفارش` : ''}
            </p>
          </div>
          <div className="min-w-0 flex-1 xl:max-w-none">
            <OrdersToolbar
            search={sp.search}
            status={sp.status}
            paymentStatus={sp.payment_status}
            productType={sp.product_type}
            />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        {error && (
          <div className="mb-4 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-small text-error">
            {error}
          </div>
        )}

        {orders.length > 0 ? (
          <>
            <Table head={['محصول', 'مشتری', 'مبلغ', 'وضعیت', 'پرداخت', 'تاریخ', 'عملیات']}>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-surface-soft/40">
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{o.product_title ?? '—'}</p>
                    {o.product_type ? (
                      <p className="mt-0.5 text-caption text-text-muted">
                        {PRODUCT_TYPE_LABELS[o.product_type] ?? o.product_type}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text">{o.customer_name}</p>
                    <p className="mt-0.5 text-caption text-text-muted" dir="ltr">
                      {o.customer_phone}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-text-muted" dir="ltr">
                      {o.order_number}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{formatToman(o.final_amount)}</td>
                  <td className="px-4 py-3">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-caption">
                    {PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-caption">
                    {o.created_at ? new Date(o.created_at).toLocaleDateString('fa-IR') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <EditLink href={`/admin/commerce/orders/${o.id}`} />
                  </td>
                </tr>
              ))}
            </Table>

            {meta && meta.last_page > 1 ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-caption text-text-muted">
                <span>
                  صفحه {meta.current_page.toLocaleString('fa-IR')} از {meta.last_page.toLocaleString('fa-IR')}
                </span>
                <div className="flex gap-2">
                  {meta.current_page > 1 ? (
                    <Link href={ordersPageHref(meta.current_page - 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                      قبلی
                    </Link>
                  ) : null}
                  {meta.current_page < meta.last_page ? (
                    <Link href={ordersPageHref(meta.current_page + 1)} className="btn btn-secondary px-3 py-1.5 text-caption">
                      بعدی
                    </Link>
                  ) : null}
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="card p-10 text-center">
            <p className="text-h3 text-primary-dark">
              {hasFilters ? 'سفارشی با این فیلتر پیدا نشد' : 'هنوز سفارشی ثبت نشده'}
            </p>
            <p className="mt-2 text-small text-text-muted">
              {hasFilters
                ? 'عبارت جستجو یا فیلترها را تغییر دهید.'
                : 'سفارش‌های پرداخت از سایت اینجا نمایش داده می‌شوند.'}
            </p>
            {hasFilters ? (
              <Link href="/admin/commerce/orders" className="btn btn-secondary mt-4 inline-flex">
                پاک کردن فیلترها
              </Link>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
