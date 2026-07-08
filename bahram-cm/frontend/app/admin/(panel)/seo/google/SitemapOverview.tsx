'use client';

import { ExternalLink } from 'lucide-react';
import { SITEMAP_SECTION_LABELS, type SitemapIndexEntry } from '@/lib/seo/sitemapXml';

interface SitemapOverviewProps {
  entries: SitemapIndexEntry[];
  baseUrl: string;
}

export function SitemapOverview({ entries, baseUrl }: SitemapOverviewProps) {
  if (!entries.length) {
    return (
      <div className="card p-6 lg:col-span-2">
        <h2 className="mb-2 text-h3 text-primary-dark">نقشه سایت (Sitemap)</h2>
        <p className="text-small text-text-muted">هنوز sitemap تولید نشده — مطمئن شوید Laravel در حال اجراست.</p>
      </div>
    );
  }

  const totalUrls = entries.reduce((sum, e) => sum + e.url_count, 0);

  return (
    <div className="card p-6 lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-h3 text-primary-dark">نقشه سایت (Sitemap Index)</h2>
          <p className="mt-1 text-small text-text-muted">
            {entries.length} فایل sitemap · {totalUrls} URL · حداکثر ۵۰ لینک در هر فایل · شامل تصویر و ویدیو
          </p>
        </div>
        <a
          href={`${baseUrl}/sitemap.xml`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary py-1.5 text-caption"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          sitemap.xml
        </a>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-right text-caption">
          <thead>
            <tr className="border-b border-border bg-surface-soft text-text-muted">
              <th className="px-3 py-2 font-semibold">بخش</th>
              <th className="px-3 py-2 font-semibold">فایل</th>
              <th className="px-3 py-2 font-semibold">تعداد URL</th>
              <th className="px-3 py-2 font-semibold">آخرین تغییر</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td className="px-3 py-2 text-text">{SITEMAP_SECTION_LABELS[entry.section] ?? entry.section}</td>
                <td className="px-3 py-2" dir="ltr">
                  <a
                    href={entry.loc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    /sitemaps/{entry.id}.xml
                  </a>
                </td>
                <td className="px-3 py-2 text-text-muted">{entry.url_count}</td>
                <td className="px-3 py-2 text-text-muted" dir="ltr">
                  {entry.lastmod ? new Date(entry.lastmod).toLocaleDateString('fa-IR') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-caption text-text-muted">
        <strong>sitemap.xml</strong> فقط فهرست فایل‌هاست — محتوای واقعی (تصویر، ویدیو، News) داخل هر فایل فرعی مثل{' '}
        <span dir="ltr">articles-1.xml</span> است. ترتیب: مقالات → Google News → دسته‌ها → برگه‌ها → لندینگ → خدمات →
        نمونه‌کار.
      </p>
    </div>
  );
}
