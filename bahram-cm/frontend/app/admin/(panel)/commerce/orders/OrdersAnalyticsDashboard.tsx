'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge, StatCard, Table } from '../../ui';
import { useAdminChartTheme } from '@/lib/admin/chartTheme';
import { formatToman, type OrderAnalytics } from '@/lib/admin/commerceTypes';
import { toFa } from '@/lib/utils';

const PERIODS = [
  { value: '1', label: 'روزانه' },
  { value: '7', label: '۷ روز' },
  { value: '30', label: '۳۰ روز' },
  { value: '90', label: '۹۰ روز' },
  { value: '365', label: '۱ سال' },
  { value: 'all', label: 'همه' },
] as const;

function formatShortDate(date: string) {
  const [, month, day] = date.split('-');
  return `${month}/${day}`;
}

function sliceRevenue(row: { amount?: number; revenue?: number }) {
  return row.revenue ?? row.amount ?? 0;
}

function GlassTooltip({
  active,
  payload,
  label,
  valueLabel = 'تعداد',
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill?: string } }[];
  label?: string;
  valueLabel?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="admin-chart-tooltip" dir="rtl">
      {label && <p className="mb-1 font-semibold text-primary-dark">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-text">
          <span
            className="admin-orders-reports__legend-dot"
            style={{ background: entry.payload.fill ?? 'var(--color-primary)' }}
          />
          <span>{entry.name}:</span>
          <span className="font-semibold">{valueLabel === 'تومان' ? formatToman(entry.value) : toFa(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; name: string; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="admin-chart-tooltip" dir="rtl">
      <p className="mb-1 font-semibold text-primary-dark" dir="ltr">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-4 text-text">
          <span className="flex items-center gap-2">
            <span className="admin-orders-reports__legend-dot" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-semibold">
            {entry.dataKey === 'revenue' ? formatToman(entry.value) : toFa(entry.value)}
          </span>
        </p>
      ))}
    </div>
  );
}

function DonutChartCard({
  title,
  subtitle,
  data,
  showAmount,
  colors,
}: {
  title: string;
  subtitle: string;
  data: { name: string; value: number; amount?: number }[];
  showAmount?: boolean;
  colors: string[];
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (!total) {
    return (
      <div className="admin-glass-chart-card flex h-full min-h-[340px] flex-col">
        <div className="admin-glass-chart-card__head">
          <div>
            <h3 className="admin-glass-chart-card__title">{title}</h3>
            <p className="admin-glass-chart-card__subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center text-small text-text-muted">داده‌ای برای نمایش نیست</div>
      </div>
    );
  }

  return (
    <div className="admin-glass-chart-card flex h-full min-h-[340px] flex-col">
      <div className="admin-glass-chart-card__head">
        <div>
          <h3 className="admin-glass-chart-card__title">{title}</h3>
          <p className="admin-glass-chart-card__subtitle">{subtitle}</p>
        </div>
        <Badge tone="accent">{toFa(total)} سفارش</Badge>
      </div>

      <div className="relative min-h-[220px] flex-1" dir="ltr">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={62}
              outerRadius={92}
              paddingAngle={4}
              stroke="none"
              cornerRadius={4}
            >
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<GlassTooltip valueLabel={showAmount ? 'تومان' : 'تعداد'} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="admin-orders-reports__donut-center">
          <span className="admin-orders-reports__donut-center-label">مجموع</span>
          <span className="admin-orders-reports__donut-center-value">{toFa(total)}</span>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border/60 pt-3">
        {data.map((item, index) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <li key={item.name} className="admin-orders-reports__legend-row">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="admin-orders-reports__legend-dot"
                  style={{ background: colors[index % colors.length] }}
                />
                <span className="truncate text-text">{item.name}</span>
              </span>
              <span className="shrink-0 font-medium text-text-muted">
                {toFa(item.value)} ({toFa(pct)}٪)
                {showAmount && item.amount != null ? ` · ${formatToman(item.amount)}` : ''}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OrdersAnalyticsDashboard({
  data,
  periodDays,
}: {
  data: OrderAnalytics;
  periodDays: number | 'all';
}) {
  const chartTheme = useAdminChartTheme();
  const periodValue = periodDays === 'all' ? 'all' : String(periodDays);
  const [productFilter, setProductFilter] = useState('all');

  useEffect(() => {
    setProductFilter('all');
  }, [periodValue, data.recent_transactions.length]);

  const productFilterOptions = useMemo(
    () =>
      data.by_product.map((row) => ({
        id: row.product_id,
        title: row.title,
      })),
    [data.by_product],
  );

  const filteredTransactions = useMemo(() => {
    if (productFilter === 'all') return data.recent_transactions;
    const productId = Number(productFilter);
    return data.recent_transactions.filter((tx) => tx.product_id === productId);
  }, [data.recent_transactions, productFilter]);

  const statusChartData = useMemo(
    () =>
      data.by_status.map((row) => ({
        name: row.label,
        value: row.count,
        amount: sliceRevenue(row),
      })),
    [data.by_status],
  );

  const paymentChartData = useMemo(
    () => data.by_payment_status.map((row) => ({ name: row.label, value: row.count })),
    [data.by_payment_status],
  );

  const dailyChartData = useMemo(
    () =>
      data.daily.map((row) => ({
        ...row,
        label: formatShortDate(row.date),
      })),
    [data.daily],
  );

  const productChartData = useMemo(
    () =>
      data.by_product.map((row) => ({
        name: row.title.length > 22 ? `${row.title.slice(0, 22)}…` : row.title,
        fullTitle: row.title,
        count: row.count,
        revenue: row.revenue,
      })),
    [data.by_product],
  );

  const gatewayChartData = useMemo(
    () =>
      data.by_gateway.map((row) => ({
        name: row.label,
        value: row.count,
        amount: sliceRevenue(row),
      })),
    [data.by_gateway],
  );

  const orderUniquenessChartData = useMemo(
    () =>
      data.by_order_uniqueness.map((row) => ({
        name: row.label,
        value: row.count,
        amount: sliceRevenue(row),
      })),
    [data.by_order_uniqueness],
  );

  const hasData = data.summary.total_orders > 0;
  const revenueGradientId = 'orders-revenue-gradient';

  return (
    <div className="admin-orders-reports space-y-6">
      <div className="admin-orders-reports__hero">
        <div className="admin-period-toolbar !border-0 !bg-transparent !p-0 !shadow-none">
          <div className="admin-period-segments" role="tablist" aria-label="بازه زمانی گزارش">
            {PERIODS.map((period) => {
              const href =
                period.value === 'all'
                  ? '/admin/commerce/orders/reports?days=all'
                  : `/admin/commerce/orders/reports?days=${period.value}`;
              const active = periodValue === period.value;
              return (
                <Link
                  key={period.value}
                  href={href}
                  role="tab"
                  aria-selected={active}
                  data-active={active ? 'true' : undefined}
                  className="admin-period-btn"
                >
                  {period.label}
                </Link>
              );
            })}
          </div>
          <p className="admin-period-summary">
            {data.period_days === 1 ? 'امروز' : data.period_days ? `${toFa(data.period_days)} روز گذشته` : 'کل دوره'}
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="admin-orders-reports__empty">
          <p className="text-h3 text-primary-dark">در این بازه سفارشی ثبت نشده</p>
          <p className="mt-2 text-small text-text-muted">
            بازه زمانی دیگری انتخاب کنید یا پس از اولین خرید گزارش پر می‌شود.
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="پرداخت‌شده"
              value={toFa(data.summary.paid_orders)}
              icon="Receipt"
              hint={
                data.summary.cancelled_orders
                  ? `${toFa(data.summary.total_orders)} سفارش · ${toFa(data.summary.cancelled_orders)} لغوشده`
                  : `${toFa(data.summary.total_orders)} کل سفارش`
              }
              tone="teal"
            />
            <StatCard
              label="درآمد محقق‌شده"
              value={formatToman(data.summary.total_revenue)}
              icon="TrendingUp"
              hint="سفارش‌های پرداخت‌شده و تحویل‌شده"
              tone="gold"
            />
            <StatCard
              label="میانگین سفارش"
              value={formatToman(data.summary.avg_order_value)}
              icon="ShoppingBag"
              hint="بر اساس سفارش‌های موفق"
              tone="blue"
            />
            <StatCard
              label="نرخ تبدیل پرداخت"
              value={`${toFa(data.summary.conversion_rate)}٪`}
              icon="Activity"
              hint={
                data.summary.pending_revenue > 0
                  ? `${formatToman(data.summary.pending_revenue)} در انتظار`
                  : 'نسبت پرداخت به کل سفارش'
              }
              tone="green"
            />
          </div>

          <div className="admin-glass-chart-card">
            <div className="admin-glass-chart-card__head">
              <div>
                <h3 className="admin-glass-chart-card__title">روند روزانه سفارش و درآمد</h3>
                <p className="admin-glass-chart-card__subtitle">
                  نمودار ترکیبی — تعداد سفارش (ستون) و درآمد محقق‌شده (ناحیه)
                </p>
              </div>
            </div>
            <div className="h-80 w-full min-w-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyChartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={revenueGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartTheme.barSecondary} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={chartTheme.barSecondary} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: chartTheme.tick }}
                    axisLine={false}
                    tickLine={false}
                    interval={dailyChartData.length > 20 ? Math.floor(dailyChartData.length / 10) : 0}
                  />
                  <YAxis
                    yAxisId="orders"
                    tick={{ fontSize: 11, fill: chartTheme.tick }}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                  />
                  <YAxis
                    yAxisId="revenue"
                    orientation="right"
                    tick={{ fontSize: 11, fill: chartTheme.tick }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v) => toFa(Math.round(Number(v) / 1_000_000)) + 'M'}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: 'var(--color-text)' }}>{value}</span>}
                  />
                  <Area
                    yAxisId="revenue"
                    type="monotone"
                    dataKey="revenue"
                    name="درآمد (تومان)"
                    stroke={chartTheme.barSecondary}
                    strokeWidth={2}
                    fill={`url(#${revenueGradientId})`}
                    fillOpacity={1}
                  />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    name="تعداد سفارش"
                    fill={chartTheme.barPrimary}
                    radius={[6, 6, 0, 0]}
                    maxBarSize={24}
                    opacity={0.92}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="لایسنس صادرشده"
              value={toFa(data.fulfillment.licenses_issued)}
              icon="KeyRound"
              hint="SpotPlayer"
              tone="amber"
            />
            <StatCard
              label="پیامک ارسال‌شده"
              value={toFa(data.fulfillment.sms_sent)}
              icon="MessageCircle"
              hint="پس از خرید"
              tone="teal"
            />
            <StatCard
              label="دسترسی دوره"
              value={toFa(data.fulfillment.course_access_granted)}
              icon="GraduationCap"
              hint="فعال‌سازی خودکار"
              tone="blue"
            />
            <StatCard
              label="خرید با معرف"
              value={toFa(data.fulfillment.referral_orders)}
              icon="Gift"
              hint="کد معرف ثبت‌شده"
              tone="gold"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DonutChartCard
              title="درگاه پرداخت"
              subtitle="تفکیک تراکنش‌های موفق بر اساس درگاه"
              data={gatewayChartData}
              showAmount
              colors={chartTheme.colors}
            />
            <DonutChartCard
              title="سفارش یونیک / تکراری"
              subtitle="هر خریدار و محصول یک‌بار یونیک؛ ثبت‌های اضافی تکراری"
              data={orderUniquenessChartData}
              showAmount
              colors={chartTheme.colors}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <DonutChartCard
              title="توزیع وضعیت سفارش"
              subtitle="سهم هر وضعیت از کل سفارش‌های ثبت‌شده"
              data={statusChartData}
              showAmount
              colors={chartTheme.colors}
            />
            <DonutChartCard
              title="وضعیت پرداخت"
              subtitle="تفکیک بر اساس نتیجه درگاه پرداخت"
              data={paymentChartData}
              colors={chartTheme.colors}
            />
          </div>

          {productChartData.length > 0 && (
            <div className="admin-glass-chart-card">
              <div className="admin-glass-chart-card__head">
                <div>
                  <h3 className="admin-glass-chart-card__title">فروش به تفکیک محصول</h3>
                  <p className="admin-glass-chart-card__subtitle">پرتکرارترین محصولات بر اساس تعداد سفارش</p>
                </div>
              </div>
              <div className="h-80 w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={productChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: chartTheme.tick }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={124}
                      tick={{ fontSize: 11, fill: chartTheme.tickStrong }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as (typeof productChartData)[number];
                        return (
                          <div className="admin-chart-tooltip" dir="rtl">
                            <p className="mb-1 font-semibold text-primary-dark">{row.fullTitle}</p>
                            <p>تعداد: {toFa(row.count)}</p>
                            <p>درآمد: {formatToman(row.revenue)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="تعداد سفارش" radius={[0, 8, 8, 0]} maxBarSize={22}>
                      {productChartData.map((_, index) => (
                        <Cell key={index} fill={chartTheme.colors[index % chartTheme.colors.length]} />
                      ))}
                    </Bar>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {data.recent_transactions.length > 0 && (
            <div className="admin-glass-chart-card !p-4 sm:!p-5">
              <div className="admin-glass-chart-card__head">
                <div>
                  <h3 className="admin-glass-chart-card__title">تراکنش‌های موفق اخیر</h3>
                  <p className="admin-glass-chart-card__subtitle">
                    Authority، Ref ID، کارت ماسک‌شده و جزئیات درگاه برای هر پرداخت
                  </p>
                </div>
                {productFilterOptions.length > 0 ? (
                  <label className="flex min-w-[10rem] flex-col gap-1 sm:min-w-[12rem]">
                    <span className="text-caption text-text-muted">فیلتر محصول</span>
                    <select
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="field-input py-1.5 text-caption"
                    >
                      <option value="all">همه محصولات</option>
                      {productFilterOptions.map((product) => (
                        <option key={product.id} value={String(product.id)}>
                          {product.title}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
              </div>

              {filteredTransactions.length === 0 ? (
                <p className="py-6 text-center text-small text-text-muted">
                  تراکنشی برای این محصول در بازه انتخاب‌شده نیست.
                </p>
              ) : (
                <>
              <div className="hidden overflow-x-auto md:block">
                <Table head={['سفارش', 'مشتری', 'محصول', 'درگاه', 'Authority', 'Ref ID', 'کارت', 'مبلغ', 'زمان']}>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-soft/40">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link
                          href={`/admin/commerce/orders/${tx.order_id}`}
                          className="font-mono text-caption text-accent hover:underline"
                          dir="ltr"
                        >
                          {tx.order_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-caption">{tx.customer_name ?? '—'}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2.5 text-caption" title={tx.product_title ?? ''}>
                        {tx.product_title ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-caption">{tx.gateway_label}</td>
                      <td
                        className="max-w-[120px] truncate px-3 py-2.5 font-mono admin-text-meta"
                        dir="ltr"
                        title={tx.authority ?? ''}
                      >
                        {tx.authority ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-caption" dir="ltr">
                        {tx.ref_id ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-caption" dir="ltr">
                        {tx.card_pan ?? '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-caption">{formatToman(tx.amount)}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-caption">
                        {tx.paid_at
                          ? new Date(tx.paid_at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredTransactions.map((tx) => (
                  <Link
                    key={tx.id}
                    href={`/admin/commerce/orders/${tx.order_id}`}
                    className="block rounded-xl border border-border/70 bg-surface-soft/30 p-3 transition hover:border-accent/40"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-caption font-semibold text-primary-dark" dir="ltr">
                          {tx.order_number}
                        </p>
                        <p className="truncate text-caption text-text-muted">{tx.customer_name}</p>
                        <p className="truncate text-caption text-text">{tx.product_title ?? '—'}</p>
                      </div>
                      <span className="shrink-0 text-caption font-semibold">{formatToman(tx.amount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="accent">{tx.gateway_label}</Badge>
                    </div>
                    <dl className="mt-2 grid gap-1 admin-text-meta text-text-muted">
                      <div className="flex justify-between gap-2" dir="ltr">
                        <span>Authority</span>
                        <span className="truncate font-mono text-text">{tx.authority ?? '—'}</span>
                      </div>
                      <div className="flex justify-between gap-2" dir="ltr">
                        <span>Ref</span>
                        <span className="font-mono text-text">{tx.ref_id ?? '—'}</span>
                      </div>
                      {tx.card_pan && (
                        <div className="flex justify-between gap-2" dir="ltr">
                          <span>Card</span>
                          <span className="font-mono text-text">{tx.card_pan}</span>
                        </div>
                      )}
                    </dl>
                  </Link>
                ))}
              </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
