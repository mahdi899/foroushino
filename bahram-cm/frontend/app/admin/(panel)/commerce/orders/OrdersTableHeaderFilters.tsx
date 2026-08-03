import { Suspense } from 'react';
import { ORDER_STATUS_LABELS } from '@/lib/admin/commerceTypes';
import { OrdersTableHeaderSelect } from './OrdersTableHeaderSelect';
import { OrdersTableSortHeader, type OrdersTableSortKey } from './OrdersTableSortHeader';

function OrdersTableSortHeaderCell({
  label,
  sortKey,
  activeSort,
  activeDir,
}: {
  label: string;
  sortKey: OrdersTableSortKey;
  activeSort?: string;
  activeDir?: string;
}) {
  return (
    <Suspense fallback={<span className="text-small font-semibold">{label}</span>}>
      <OrdersTableSortHeader
        label={label}
        sortKey={sortKey}
        activeSort={activeSort}
        activeDir={activeDir}
      />
    </Suspense>
  );
}

export function OrdersTableAmountSortHeader({
  activeSort,
  activeDir,
}: {
  activeSort?: string;
  activeDir?: string;
}) {
  return (
    <OrdersTableSortHeaderCell label="مبلغ" sortKey="amount" activeSort={activeSort} activeDir={activeDir} />
  );
}

export function OrdersTableDateSortHeader({
  activeSort,
  activeDir,
}: {
  activeSort?: string;
  activeDir?: string;
}) {
  return (
    <OrdersTableSortHeaderCell
      label="تاریخ"
      sortKey="created_at"
      activeSort={activeSort}
      activeDir={activeDir}
    />
  );
}

export function OrdersTableHeaderFilters({ status }: { status?: string }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <Suspense fallback={null}>
        <OrdersTableHeaderSelect
          param="status"
          value={status}
          placeholder="وضعیت"
          options={ORDER_STATUS_LABELS}
          aria-label="فیلتر وضعیت سفارش"
        />
      </Suspense>
    </div>
  );
}

export function OrdersTableStatusFilter({ status }: { status?: string }) {
  return (
    <Suspense fallback={<span className="text-small font-semibold">وضعیت</span>}>
      <OrdersTableHeaderSelect
        param="status"
        value={status}
        placeholder="وضعیت"
        options={ORDER_STATUS_LABELS}
        aria-label="فیلتر وضعیت سفارش"
      />
    </Suspense>
  );
}
