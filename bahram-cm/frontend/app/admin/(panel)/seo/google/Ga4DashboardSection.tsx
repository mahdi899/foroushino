'use client';

import Link from 'next/link';
import { AlertCircle, BarChart3 } from 'lucide-react';
import { Badge, StatCard, Table } from '../../ui';
import { toFa } from '@/lib/utils';
import type { Ga4DashboardData } from '@/lib/admin/ga4';

function SessionsChart({ data }: { data: Ga4DashboardData['daily_sessions'] }) {
  if (!data.length) {
    return <div className="card p-6 text-center text-small text-text-muted">داده‌ای برای نمودار موجود نیست.</div>;
  }

  const max = Math.max(...data.map((d) => d.sessions), 1);
  const showLabels = data.length <= 14;

  return (
    <div className="card p-4">
      <div className="flex h-44 items-end gap-1 sm:gap-1.5" dir="ltr">
        {data.map((point) => {
          const height = Math.max(4, Math.round((point.sessions / max) * 100));
          return (
            <div key={point.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
              <span className="hidden text-[10px] text-text-muted group-hover:block">{toFa(point.sessions)}</span>
              <div
                className="w-full rounded-t bg-primary/80 transition group-hover:bg-primary"
                style={{ height: `${height}%` }}
                title={`${point.date}: ${point.sessions}`}
              />
              {showLabels && (
                <span className="truncate text-[9px] text-text-muted" dir="ltr">
                  {point.date.slice(5)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Ga4DashboardSection({ ga4 }: { ga4: Ga4DashboardData }) {
  const hasLiveData = ga4.configured && ga4.totals.sessions > 0;
  const setupNeeded = !ga4.configured || Boolean(ga4.error);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <BarChart3 className="h-5 w-5 text-accent" />
        <h2 className="text-h3 text-primary-dark">ترافیک GA4</h2>
        {hasLiveData && (
          <Badge tone="success">{toFa(ga4.period_days)} روز گذشته</Badge>
        )}
        {ga4.property_id && (
          <span className="text-caption text-text-muted" dir="ltr">
            Property {ga4.property_id}
          </span>
        )}
      </div>

      {setupNeeded && (
        <div className="mb-4 flex gap-3 rounded-lg border border-border bg-surface-soft p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <div className="text-small text-text-muted">
            {ga4.error ? (
              <p className="mb-2 text-text">{ga4.error}</p>
            ) : (
              <p className="mb-2 text-text">برای نمایش داده GA4 در پنل، از تنظیمات سایت استفاده کنید:</p>
            )}
            <ol className="list-decimal space-y-1 pr-5 text-caption">
              <li>
                برو به{' '}
                <Link href="/admin/settings#google-tracking" className="text-primary underline">
                  تنظیمات سایت
                </Link>
              </li>
              <li>تیک «نمایش داده Google Analytics» را بزن و Property ID را وارد کن.</li>
              <li>فایل JSON Service Account را آپلود کن (در GA4 به آن ایمیل نقش Viewer بده).</li>
            </ol>
            <p className="mt-2 text-caption text-text-muted">
              env فقط fallback است — معمولاً لازم نیست.
            </p>
          </div>
        </div>
      )}

      {ga4.configured && (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="کاربران فعال" value={toFa(ga4.totals.active_users)} icon="Users" />
            <StatCard label="جلسات (Sessions)" value={toFa(ga4.totals.sessions)} icon="Activity" />
            <StatCard label="بازدید صفحه" value={toFa(ga4.totals.page_views)} icon="Eye" />
            <StatCard label="نرخ تعامل" value={`${toFa(ga4.totals.engagement_rate)}٪`} icon="TrendingUp" />
          </div>

          <h3 className="mb-2 text-small font-semibold text-primary-dark">جلسات روزانه</h3>
          <SessionsChart data={ga4.daily_sessions} />

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-small font-semibold text-primary-dark">پربازدیدترین صفحات</h3>
              {ga4.top_pages.length ? (
                <Table head={['مسیر', 'بازدید']}>
                  {ga4.top_pages.map((p) => (
                    <tr key={p.path}>
                      <td className="max-w-[220px] truncate px-4 py-3 font-mono text-caption text-text" dir="ltr" title={p.path}>
                        {p.path}
                      </td>
                      <td className="px-4 py-3 font-semibold text-text">{toFa(p.views)}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="card p-6 text-center text-small text-text-muted">داده‌ای نیست.</div>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-small font-semibold text-primary-dark">رویدادهای GA4</h3>
              {ga4.top_events.length ? (
                <Table head={['رویداد', 'تعداد']}>
                  {ga4.top_events.map((e) => (
                    <tr key={e.name}>
                      <td className="px-4 py-3">
                        <Badge tone="accent">{e.name}</Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-text">{toFa(e.count)}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <div className="card p-6 text-center text-small text-text-muted">داده‌ای نیست.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
