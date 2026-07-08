import Link from 'next/link';
import { Search } from 'lucide-react';
import { OrdersExportButton } from './OrdersExportButton';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/admin/commerceTypes';

const selectClass = 'field-input w-full min-w-0 py-2 text-small';

export function OrdersToolbar({
  search,
  status,
  paymentStatus,
  productType,
}: {
  search?: string;
  status?: string;
  paymentStatus?: string;
  productType?: string;
}) {
  const hasFilters = Boolean(search?.trim() || status || paymentStatus || productType);

  return (
    <form method="get" className="flex w-full min-w-0 flex-col gap-2.5">
      <div className="relative min-w-0 w-full">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          name="search"
          defaultValue={search}
          placeholder="جستجو: نام، موبایل، سفارش..."
          className="field-input w-full py-2 pr-9 text-small"
        />
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        <select name="status" defaultValue={status ?? ''} className={selectClass} aria-label="وضعیت سفارش">
          <option value="">همه وضعیت‌ها</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select name="payment_status" defaultValue={paymentStatus ?? ''} className={selectClass} aria-label="وضعیت پرداخت">
          <option value="">همه پرداخت‌ها</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>

        <select
          name="product_type"
          defaultValue={productType ?? ''}
          className={`${selectClass} sm:col-span-2 xl:col-span-1`}
          aria-label="نوع محصول"
        >
          <option value="">همه محصولات</option>
          {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="submit" className="btn btn-primary whitespace-nowrap px-3 py-2 text-small">
          اعمال
        </button>
        {hasFilters ? (
          <Link href="/admin/commerce/orders" className="btn btn-secondary whitespace-nowrap px-3 py-2 text-small">
            پاک کردن
          </Link>
        ) : null}
        <OrdersExportButton
          search={search}
          status={status}
          paymentStatus={paymentStatus}
          productType={productType}
        />
      </div>
    </form>
  );
}
