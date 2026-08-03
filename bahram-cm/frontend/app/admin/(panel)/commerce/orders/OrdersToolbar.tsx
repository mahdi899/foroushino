import Link from 'next/link';
import { Search } from 'lucide-react';
import { OrdersExportButton } from './OrdersExportButton';
import { OrdersPeriodPresets } from './OrdersPeriodPresets';
import { PRODUCT_TYPE_LABELS } from '@/lib/admin/commerceTypes';
import { OrdersTableHeaderFilters } from './OrdersTableHeaderFilters';
import { activeOrdersPeriod, ordersHasFilters, type OrdersListParams } from './ordersQuery';

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
  const customRangeActive = activeOrdersPeriod(params) === 'custom';

  return (
    <form method="get" className="flex w-full min-w-0 flex-col gap-2.5">
      <OrdersPeriodPresets params={params} />

      <div className="relative min-w-0 w-full">
        <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          name="search"
          defaultValue={search}
          placeholder="جستجو: نام، موبایل، سفارش..."
          className="field-input w-full py-2 pr-9 text-small"
        />
      </div>

      {status ? <input type="hidden" name="status" value={status} /> : null}
      {sort ? <input type="hidden" name="sort" value={sort} /> : null}
      {dir ? <input type="hidden" name="dir" value={dir} /> : null}

      <div className="md:hidden">
        <OrdersTableHeaderFilters status={status} />
      </div>

      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <label className="min-w-0">
          <span className="field-label">از تاریخ</span>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            className={selectClass}
            aria-label="از تاریخ"
          />
        </label>
        <label className="min-w-0">
          <span className="field-label">تا تاریخ</span>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            className={selectClass}
            aria-label="تا تاریخ"
          />
        </label>
      </div>

      {customRangeActive ? (
        <p className="text-caption text-text-muted">بازه دلخواه فعال است — برای presetها یکی از دکمه‌های بالا را بزنید.</p>
      ) : null}

      <div className="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-1">
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
          productType={productType}
          sort={sort}
          dir={dir}
          days={days}
          from={from}
          to={to}
        />
      </div>
    </form>
  );
}
