import Link from 'next/link';
import {
  ORDER_PERIOD_PRESETS,
  activeOrdersPeriod,
  buildOrdersHref,
  type OrdersListParams,
} from './ordersQuery';

export function OrdersPeriodPresets({ params }: { params: OrdersListParams }) {
  const active = activeOrdersPeriod(params);

  return (
    <div className="admin-period-toolbar admin-orders-toolbar__periods">
      <div className="admin-period-segments" role="tablist" aria-label="بازه زمانی سفارش‌ها">
        {ORDER_PERIOD_PRESETS.map((preset) => {
          const presetActive = active === preset.value;
          const href = buildOrdersHref(params, {
            days: preset.value || undefined,
            from: undefined,
            to: undefined,
            page: undefined,
          });

          return (
            <Link
              key={preset.value || 'all'}
              href={href}
              className="admin-period-btn text-caption"
              data-active={presetActive ? 'true' : undefined}
              aria-current={presetActive ? 'page' : undefined}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
