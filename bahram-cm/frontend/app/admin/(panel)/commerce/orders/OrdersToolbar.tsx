import Link from 'next/link';
import { Search } from 'lucide-react';
import { OrdersExportButton } from './OrdersExportButton';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS, PRODUCT_TYPE_LABELS } from '@/lib/admin/commerceTypes';

const selectClass =
  'field-input shrink-0 text-small py-2 w-[8.75rem] sm:w-[9.25rem]';

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
    <form
      className="flex w-full min-w-0 items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      method="get"
    >
      <div className="relative min-w-[11rem] flex-1 shrink">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          name="search"
          defaultValue={search}
          placeholder="جستجو: نام، موبایل، سفارش..."
          className="field-input w-full py-2 pr-9 text-small"
        />
      </div>

      <select name="status" defaultValue={status ?? ''} className={selectClass}>
        <option value="">همه وضعیت‌ها</option>
        {Object.entries(ORDER_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <select name="payment_status" defaultValue={paymentStatus ?? ''} className={selectClass}>
        <option value="">همه پرداخت‌ها</option>
        {Object.entries(PAYMENT_STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <select name="product_type" defaultValue={productType ?? ''} className={`${selectClass} sm:w-[10rem]`}>
        <option value="">همه محصولات</option>
        {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>

      <button type="submit" className="btn btn-primary shrink-0 whitespace-nowrap px-3 py-2 text-small">
        اعمال
      </button>
      {hasFilters ? (
        <Link href="/admin/commerce/orders" className="btn btn-secondary shrink-0 whitespace-nowrap px-3 py-2 text-small">
          پاک کردن
        </Link>
      ) : null}
      <OrdersExportButton
        search={search}
        status={status}
        paymentStatus={paymentStatus}
        productType={productType}
      />
    </form>
  );
}
