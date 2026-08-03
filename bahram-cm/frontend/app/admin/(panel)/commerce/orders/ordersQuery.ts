export type OrdersListParams = {
  search?: string;
  status?: string;
  product_type?: string;
  page?: string | number;
  sort?: string;
  dir?: string;
  days?: string;
  from?: string;
  to?: string;
};

export const ORDER_PERIOD_PRESETS = [
  { value: '', label: 'همه' },
  { value: '7', label: '۷ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
  { value: '365', label: '۱ سال' },
] as const;

export function buildOrdersHref(
  params: OrdersListParams,
  overrides?: Partial<OrdersListParams>,
): string {
  const merged = { ...params, ...overrides };
  const query = new URLSearchParams();

  if (merged.search?.trim()) query.set('search', merged.search.trim());
  if (merged.status) query.set('status', merged.status);
  if (merged.product_type) query.set('product_type', merged.product_type);
  if (merged.sort) query.set('sort', merged.sort);
  if (merged.dir) query.set('dir', merged.dir);
  if (merged.from) query.set('from', merged.from);
  if (merged.to) query.set('to', merged.to);
  if (merged.days) query.set('days', merged.days);

  const page = Number(merged.page);
  if (Number.isFinite(page) && page > 1) {
    query.set('page', String(page));
  }

  const qs = query.toString();
  return qs ? `/admin/commerce/orders?${qs}` : '/admin/commerce/orders';
}

export function ordersHasFilters(params: OrdersListParams): boolean {
  return Boolean(
    params.search?.trim() ||
      params.status ||
      params.product_type ||
      params.from ||
      params.to ||
      params.days,
  );
}

export function activeOrdersPeriod(params: OrdersListParams): string {
  if (params.from || params.to) return 'custom';
  return params.days ?? '';
}
