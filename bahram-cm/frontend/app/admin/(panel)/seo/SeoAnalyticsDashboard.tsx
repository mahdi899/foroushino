import Link from 'next/link';
import { ExternalLink, Search } from 'lucide-react';
import { Badge } from '../ui';
import { getRobotsTxtConfig, getSitemapIndex } from './actions';
import { getGa4Dashboard, getReports } from '@/lib/admin/data';
import { gaDashboardEmbedUrl } from '@/lib/tracking/cloudflare';
import { getPublicTrackingConfig, siteBaseUrl } from '@/lib/tracking/public';
import { GoogleAnalyticsPanel } from './google/GoogleAnalyticsPanel';
import { RobotsTxtEditor } from './google/RobotsTxtEditor';
import { SitemapOverview } from './google/SitemapOverview';

function StatusRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-small">
      <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? 'bg-success' : 'bg-text-muted/40'}`} />
      <span className={ok ? 'text-text' : 'text-text-muted'}>{label}</span>
    </div>
  );
}

export async function SeoAnalyticsDashboard() {
  const [config, robots, sitemapIndex, reports, ga4] = await Promise.all([
    getPublicTrackingConfig(),
    getRobotsTxtConfig(),
    getSitemapIndex(),
    getReports(),
    getGa4Dashboard(),
  ]);

  const baseUrl = siteBaseUrl();
  const dashboardEmbedUrl = gaDashboardEmbedUrl();
  let siteHostname = 'Bahram.com';
  try {
    siteHostname = new URL(baseUrl).hostname;
  } catch {
    /* keep default */
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <GoogleAnalyticsPanel reports={reports} ga4={ga4} dashboardEmbedUrl={dashboardEmbedUrl} siteHostname={siteHostname} />

      <div className="card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" />
          <h2 className="text-h3 text-primary-dark">Google Search Console</h2>
          <Badge tone={config.search_console.configured ? 'success' : 'default'}>
            {config.search_console.configured ? 'تأیید شده' : 'نیاز به تنظیم'}
          </Badge>
        </div>
        <div className="mb-4 space-y-2">
          <StatusRow ok={Boolean(config.search_console.enabled)} label="متا تگ تأیید فعال" />
          <StatusRow
            ok={Boolean(config.search_console.verification_code)}
            label={config.search_console.verification_code ? 'کد تأیید تنظیم شده' : 'کد تأیید وارد نشده'}
          />
          <StatusRow ok={Boolean(config.indexnow.configured)} label="IndexNow برای Bing/Yandex" />
          <StatusRow ok={Boolean(robots?.is_custom)} label={robots?.is_custom ? 'robots.txt سفارشی' : 'robots.txt پیش‌فرض'} />
        </div>
        <div className="mb-4 rounded-lg bg-surface-soft p-3 text-caption text-text-muted">
          <p className="mb-2 font-semibold text-text">آدرس sitemap برای ثبت در GSC:</p>
          <code className="block break-all text-primary" dir="ltr">
            {baseUrl}/sitemap.xml
          </code>
          <p className="mt-2 font-semibold text-text">robots.txt:</p>
          <code className="block break-all text-primary" dir="ltr">
            {baseUrl}/robots.txt
          </code>
        </div>
        <a
          href="https://search.google.com/search-console"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary py-1.5 text-caption"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          باز کردن Search Console
        </a>
      </div>

      <RobotsTxtEditor initial={robots} baseUrl={baseUrl} />

      <SitemapOverview entries={sitemapIndex} baseUrl={baseUrl} />

      <div className="card p-6 lg:col-span-2">
        <h2 className="mb-3 text-h3 text-primary-dark">راهنمای راه‌اندازی</h2>
        <ol className="list-decimal space-y-2 pr-5 text-small text-text-muted">
          <li>
            در{' '}
            <a
              href="https://dash.cloudflare.com/?to=/:account/zaraz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Cloudflare → Zaraz
            </a>{' '}
            ابزار Google Analytics 4 را برای دامنه سایت فعال کنید.
          </li>
          <li>
            در{' '}
            <Link href="/admin/settings#google-tracking" className="text-primary underline">
              تنظیمات سایت
            </Link>{' '}
            داشبورد GA4، Search Console و IndexNow را تنظیم کنید.
          </li>
          <li>در Search Console، sitemap <span dir="ltr">{baseUrl}/sitemap.xml</span> را Submit کنید.</li>
          <li>robots.txt را در همین تب ویرایش کنید — معمولاً /admin و /api باید Disallow باشند.</li>
        </ol>
      </div>
    </div>
  );
}
