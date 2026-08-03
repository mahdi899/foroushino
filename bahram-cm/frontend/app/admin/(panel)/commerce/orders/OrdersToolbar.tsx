import Link from 'next/link';
import { Search } from 'lucide-react';
import { OrdersExportButton } from './OrdersExportButton';
import { OrdersPeriodPresets } from './OrdersPeriodPresets';
import { OrdersDateRangeFields } from './OrdersDateRangeFields';
import { PRODUCT_TYPE_LABELS } from '@/lib/admin/commerceTypes';
import { OrdersTableHeaderFilters } from './OrdersTableHeaderFilters';
import { ordersHasFilters, type OrdersListParams } from './ordersQuery';

const selectClass = 'field-input w-full min-w-0 py-2 text-small';

export function OrdersToolbar({
  search,
  status,
  productType,
  sort,
  dir,
  days,
  from,
  to,
}: OrdersListParams) {
  const params: OrdersListParams = { search, status, product_type: productType, sort, dir, days, from, to };
  const hasFilters = ordersHasFilters(params);

  return (
    <form method="get" className="admin-orders-toolbar">
      <OrdersPeriodPresets params={params} />

      <div className="admin-orders-toolbar__grid">
        <div className="admin-orders-toolbar__search relative min-w-0">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            name="search"
            defaultValue={search}
            placeholder="جستجو: نام، موبایل، سفارش..."
            className="field-input w-full py-2 pr-9 text-small"
          />
        </div>

        <label className="admin-orders-toolbar__field min-w-0">
          <span className="field-label">نوع محصول</span>
          <select
            name="product_type"
            defaultValue={productType ?? ''}
            className={selectClass}
            aria-label="نوع محصول"
          >
            <option value="">همه محصولات</option>
            {Object.entries(PRODUCT_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <OrdersDateRangeFields from={from} to={to} />

        <div className="admin-orders-toolbar__actions flex min-w-0 flex-wrap items-end gap-2">
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
            productType={productType}
            sort={sort}
            dir={dir}
            days={days}
            from={from}
            to={to}
          />
        </div>
      </div>

      {status ? <input type="hidden" name="status" value={status} /> : null}
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      {dir ? <input type="hidden" name="dir" value={dir} /> : null}

      <div className="md:hidden">
        <OrdersTableHeaderFilters status={status} />
      </div>
    </form>
  );
}
