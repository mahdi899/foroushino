import { Suspense } from 'react';
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/admin/commerceTypes';
import { OrdersTableHeaderSelect } from './OrdersTableHeaderSelect';

export function OrdersTableHeaderFilters({
  status,
  paymentStatus,
}: {
  status?: string;
  paymentStatus?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Suspense fallback={null}>
        <OrdersTableHeaderSelect
          param="status"
          value={status}
          placeholder="وضعیت"
          options={ORDER_STATUS_LABELS}
          aria-label="فیلتر وضعیت سفارش"
        />
        <OrdersTableHeaderSelect
          param="payment_status"
          value={paymentStatus}
          placeholder="پرداخت"
          options={PAYMENT_STATUS_LABELS}
          aria-label="فیلتر وضعیت پرداخت"
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

export function OrdersTablePaymentFilter({ paymentStatus }: { paymentStatus?: string }) {
  return (
    <Suspense fallback={<span className="text-small font-semibold">پرداخت</span>}>
      <OrdersTableHeaderSelect
        param="payment_status"
        value={paymentStatus}
        placeholder="پرداخت"
        options={PAYMENT_STATUS_LABELS}
        aria-label="فیلتر وضعیت پرداخت"
      />
    </Suspense>
  );
}
