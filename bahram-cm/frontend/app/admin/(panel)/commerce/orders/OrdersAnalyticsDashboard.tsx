'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel = 'تعداد',
  colors,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { fill?: string } }[];
  label?: string;
  valueLabel?: string;
  colors: string[];
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-caption shadow-soft">
      {label && <p className="mb-1 font-semibold text-primary-dark">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-text">
          <span className="h-2 w-2 rounded-full" style={{ background: entry.payload.fill ?? colors[0] }} />
          <span>{entry.name}:</span>
          <span className="font-semibold">{toFa(entry.value)}</span>
          {valueLabel === 'تومان' && <span className="text-text-muted">تومان</span>}
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
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-caption shadow-soft" dir="rtl">
      <p className="mb-1 font-semibold text-primary-dark" dir="ltr">
        {label}
      </p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="flex items-center justify-between gap-4 text-text">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
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
      <div className="card flex h-full min-h-[320px] flex-col p-5">
        <h3 className="text-small font-bold text-primary-dark">{title}</h3>
        <p className="mt-1 text-caption text-text-muted">{subtitle}</p>
        <div className="flex flex-1 items-center justify-center text-small text-text-muted">داده‌ای برای نمایش نیست</div>
      </div>
    );
  }

  return (
    <div className="card flex h-full min-h-[320px] flex-col p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-small font-bold text-primary-dark">{title}</h3>
          <p className="mt-1 text-caption text-text-muted">{subtitle}</p>
        </div>
        <Badge tone="accent">{toFa(total)} سفارش</Badge>
      </div>

      <div className="relative min-h-[200px] flex-1" dir="ltr">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              paddingAngle={3}
              stroke="none"
            >
              {data.map((_, index) => (
                <Cell key={index} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip valueLabel={showAmount ? 'تومان' : 'تعداد'} colors={colors} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-caption text-text-muted">مجموع</span>
          <span className="text-h3 font-extrabold text-primary-dark">{toFa(total)}</span>
        </div>
      </div>

      <ul className="mt-3 space-y-2 border-t border-border pt-3">
        {data.map((item, index) => {
          const pct = Math.round((item.value / total) * 100);
          return (
            <li key={item.name} className="flex items-center justify-between gap-2 text-caption">
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
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

  const statusChartData = useMemo(
    () =>
      data.by_status.map((row) => ({
        name: row.label,
        value: row.count,
        amount: row.amount,
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
    () => data.by_gateway.map((row) => ({ name: row.label, value: row.count, amount: row.amount })),
    [data.by_gateway],
  );

  const gatewayModeChartData = useMemo(
    () => data.by_gateway_mode.map((row) => ({ name: row.label, value: row.count, amount: row.amount })),
    [data.by_gateway_mode],
  );

  const hasData = data.summary.total_orders > 0;

  return (
    <div className="space-y-6">
      <div className="admin-period-toolbar">
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
          {data.period_days ? `${toFa(data.period_days)} روز گذشته` : 'کل دوره'}
        </p>
      </div>

      {!hasData ? (
        <div className="card p-10 text-center">
          <p className="text-h3 text-primary-dark">در این بازه سفارشی ثبت نشده</p>
          <p className="mt-2 text-small text-text-muted">بازه زمانی دیگری انتخاب کنید یا پس از اولین خرید گزارش پر می‌شود.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="کل سفارش‌ها"
              value={toFa(data.summary.total_orders)}
              icon="Receipt"
              hint={`${toFa(data.summary.paid_orders)} پرداخت‌شده`}
            />
            <StatCard
              label="درآمد محقق‌شده"
              value={formatToman(data.summary.total_revenue)}
              icon="TrendingUp"
              hint="سفارش‌های پرداخت‌شده و تحویل‌شده"
            />
            <StatCard
              label="میانگین سفارش"
              value={formatToman(data.summary.avg_order_value)}
              icon="ShoppingBag"
              hint="بر اساس سفارش‌های موفق"
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
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="لایسنس صادرشده" value={toFa(data.fulfillment.licenses_issued)} icon="KeyRound" hint="SpotPlayer" />
            <StatCard label="پیامک ارسال‌شده" value={toFa(data.fulfillment.sms_sent)} icon="MessageCircle" hint="پس از خرید" />
            <StatCard
              label="دسترسی دوره"
              value={toFa(data.fulfillment.course_access_granted)}
              icon="GraduationCap"
              hint="فعال‌سازی خودکار"
            />
            <StatCard label="خرید با معرف" value={toFa(data.fulfillment.referral_orders)} icon="Gift" hint="کد معرف ثبت‌شده" />
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
              title="حالت درگاه (واقعی / تست)"
              subtitle="تفکیک پرداخت‌های زرین‌پال سندباکس و واقعی"
              data={gatewayModeChartData}
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

          <div className="card p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-small font-bold text-primary-dark">روند روزانه سفارش و درآمد</h3>
                <p className="mt-1 text-caption text-text-muted">تعداد سفارش‌های جدید و درآمد محقق‌شده در هر روز</p>
              </div>
            </div>
            <div className="h-72 w-full min-w-0" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
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
                    width={48}
                    tickFormatter={(v) => toFa(Math.round(Number(v) / 1_000_000)) + 'M'}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => <span style={{ color: 'var(--color-text)' }}>{value}</span>}
                  />
                  <Bar
                    yAxisId="orders"
                    dataKey="orders"
                    name="تعداد سفارش"
                    fill={chartTheme.barPrimary}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    yAxisId="revenue"
                    dataKey="revenue"
                    name="درآمد (تومان)"
                    fill={chartTheme.barSecondary}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {productChartData.length > 0 && (
            <div className="card p-5">
              <div className="mb-4">
                <h3 className="text-small font-bold text-primary-dark">فروش به تفکیک محصول</h3>
                <p className="mt-1 text-caption text-text-muted">پرتکرارترین محصولات بر اساس تعداد سفارش</p>
              </div>
              <div className="h-80 w-full min-w-0" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={productChartData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
                    barCategoryGap="18%"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: chartTheme.tick }} axisLine={false} tickLine={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tick={{ fontSize: 11, fill: chartTheme.tickStrong }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const row = payload[0].payload as (typeof productChartData)[number];
                        return (
                          <div className="rounded-lg border border-border bg-surface px-3 py-2 text-caption shadow-soft" dir="rtl">
                            <p className="mb-1 font-semibold text-primary-dark">{row.fullTitle}</p>
                            <p>تعداد: {toFa(row.count)}</p>
                            <p>درآمد: {formatToman(row.revenue)}</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" name="تعداد سفارش" radius={[0, 6, 6, 0]} maxBarSize={22}>
                      {productChartData.map((_, index) => (
                        <Cell key={index} fill={chartTheme.colors[index % chartTheme.colors.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {data.recent_transactions.length > 0 && (
            <div className="card p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-small font-bold text-primary-dark">تراکنش‌های موفق اخیر</h3>
                <p className="mt-1 text-caption text-text-muted">
                  Authority، Ref ID، کارت ماسک‌شده و جزئیات درگاه برای هر پرداخت
                </p>
              </div>

              <div className="hidden overflow-x-auto md:block">
                <Table head={['سفارش', 'مشتری', 'درگاه', 'حالت', 'Authority', 'Ref ID', 'کارت', 'مبلغ', 'زمان']}>
                  {data.recent_transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-surface-soft/40">
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <Link href={`/admin/commerce/orders/${tx.order_id}`} className="font-mono text-caption text-accent hover:underline" dir="ltr">
                          {tx.order_number}
                        </Link>
                      </td>
                      <td className="px-3 py-2.5 text-caption">{tx.customer_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-caption">{tx.gateway_label}</td>
                      <td className="px-3 py-2.5">
                        <Badge tone={tx.mode === 'sandbox' ? 'warning' : 'success'}>{tx.mode_label}</Badge>
                      </td>
                      <td className="max-w-[120px] truncate px-3 py-2.5 font-mono text-[11px]" dir="ltr" title={tx.authority ?? ''}>
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
                        {tx.paid_at ? new Date(tx.paid_at).toLocaleString('fa-IR', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>

              <div className="space-y-3 md:hidden">
                {data.recent_transactions.map((tx) => (
                  <Link
                    key={tx.id}
                    href={`/admin/commerce/orders/${tx.order_id}`}
                    className="block rounded-lg border border-border bg-surface-soft/30 p-3 transition hover:border-accent/40"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-mono text-caption font-semibold text-primary-dark" dir="ltr">
                          {tx.order_number}
                        </p>
                        <p className="truncate text-caption text-text-muted">{tx.customer_name}</p>
                      </div>
                      <span className="shrink-0 text-caption font-semibold">{formatToman(tx.amount)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge tone="accent">{tx.gateway_label}</Badge>
                      <Badge tone={tx.mode === 'sandbox' ? 'warning' : 'success'}>{tx.mode_label}</Badge>
                    </div>
                    <dl className="mt-2 grid gap-1 text-[11px] text-text-muted">
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
            </div>
          )}
        </>
      )}
    </div>
  );
}
