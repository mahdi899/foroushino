'use client';

import Link from 'next/link';
import { BarChart3, Cloud, ExternalLink, TrendingUp } from 'lucide-react';
import { Badge, StatCard, Table } from '../../ui';
import { toFa } from '@/lib/utils';
import { Ga4DashboardSection } from './Ga4DashboardSection';
import type { Ga4DashboardData } from '@/lib/admin/ga4';
import type { ReportsData } from '@/lib/admin/data';

interface GoogleAnalyticsPanelProps {
  reports: ReportsData;
  ga4: Ga4DashboardData;
  dashboardEmbedUrl: string | null;
  siteHostname: string;
}

export function GoogleAnalyticsPanel({ reports, ga4, dashboardEmbedUrl, siteHostname }: GoogleAnalyticsPanelProps) {
  const topEvents = reports.by_event.slice(0, 6);

  return (
    <div className="space-y-6 lg:col-span-2">
      <div className="card p-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Cloud className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-primary-dark">Google Analytics</h2>
          <Badge tone="success">Cloudflare Zaraz</Badge>
        </div>
        <p className="mb-4 text-small text-text-muted">
          ردیابی GA4 از طریق{' '}
          <a
            href="https://developers.cloudflare.com/zaraz/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Cloudflare Zaraz
          </a>{' '}
          روی دامنه <span dir="ltr">{siteHostname}</span> انجام می‌شود — بدون اسکریپت اضافه در کد سایت.
          رویدادهای تبدیل (lead، واتساپ، تماس، ماشین‌حساب) به <code dir="ltr">dataLayer</code> ارسال می‌شوند
          و Zaraz آن‌ها را به GA4 فوروارد می‌کند.
        </p>
        <div className="flex flex-wrap gap-2">
          <a
            href="https://dash.cloudflare.com/?to=/:account/zaraz"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary py-1.5 text-caption"
          >
            <Cloud className="h-3.5 w-3.5" />
            تنظیم Zaraz در Cloudflare
          </a>
          <a
            href="https://analytics.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary py-1.5 text-caption"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Google Analytics
          </a>
          <Link href="/admin/reports" className="btn btn-ghost py-1.5 text-caption">
            <BarChart3 className="h-3.5 w-3.5" />
            گزارش‌های داخلی
          </Link>
        </div>
      </div>

      <Ga4DashboardSection ga4={ga4} />

      <div>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-primary-dark">تبدیل‌ها (داده داخلی سرور)</h2>
        </div>
        <p className="mb-4 text-caption text-text-muted">
          رویدادهای ثبت‌شده در دیتابیس سایت — مکمل داده GA4 برای ردیابی lead و فرم‌ها.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="کل رویدادها" value={toFa(reports.total_events)} icon="Activity" />
          <StatCard label="سرنخ‌ها" value={toFa(reports.leads)} icon="Inbox" />
          <StatCard label="مشاوره کامل" value={toFa(reports.consultations)} icon="Sparkles" />
          <StatCard label="نرخ تبدیل" value={`${toFa(reports.conversion_rate)}٪`} icon="TrendingUp" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-small font-semibold text-primary-dark">رویدادهای پرتکرار</h3>
          {topEvents.length ? (
            <Table head={['رویداد', 'تعداد']}>
              {topEvents.map((e) => (
                <tr key={e.type}>
                  <td className="px-4 py-3">
                    <Badge tone="accent">{e.type}</Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-text">{toFa(e.count)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="card p-6 text-center text-small text-text-muted">هنوز رویدادی ثبت نشده است.</div>
          )}
        </div>
        <div>
          <h3 className="mb-3 text-small font-semibold text-primary-dark">سرنخ‌ها بر اساس منبع</h3>
          {reports.by_source.length ? (
            <Table head={['منبع', 'تعداد']}>
              {reports.by_source.map((s) => (
                <tr key={s.source}>
                  <td className="px-4 py-3 text-text">{s.source}</td>
                  <td className="px-4 py-3 font-semibold text-text">{toFa(s.count)}</td>
                </tr>
              ))}
            </Table>
          ) : (
            <div className="card p-6 text-center text-small text-text-muted">هنوز سرنخی ثبت نشده است.</div>
          )}
        </div>
      </div>

      {dashboardEmbedUrl && (
        <div className="card overflow-hidden p-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-small font-semibold text-primary-dark">داشبورد GA (Looker Studio)</h3>
          </div>
          <iframe
            src={dashboardEmbedUrl}
            title="Google Analytics Dashboard"
            className="aspect-[16/10] w-full min-h-[420px] border-0 bg-surface"
            loading="lazy"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}
