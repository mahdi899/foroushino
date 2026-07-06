import 'server-only';

import { revalidatePath, revalidateTag } from 'next/cache';
import { getIndexNowKey, siteBaseUrl } from '@/lib/tracking/public';

export interface CrawlerNotifyResult {
  ok: boolean;
  message: string;
  details: string[];
}

function siteBase(): string {
  return siteBaseUrl();
}

/** Revalidate sitemap cache and ping search engines after publishing a URL. */
export async function notifySearchCrawlers(articlePath: string): Promise<CrawlerNotifyResult> {
  const base = siteBase();
  const path = articlePath.startsWith('/') ? articlePath : `/${articlePath}`;
  const articleUrl = `${base}${path}`;
  const sitemapUrl = `${base}/sitemap.xml`;
  const details: string[] = [];

  revalidateTag('seo', 'max');
  revalidatePath('/sitemap.xml');
  revalidatePath('/sitemaps');
  revalidatePath(path);
  details.push('کش sitemap و صفحه مقاله به‌روز شد');

  const indexNowKey = (await getIndexNowKey())?.trim();
  if (indexNowKey) {
    try {
      const host = new URL(base).hostname;
      const res = await fetch('https://api.indexnow.org/indexnow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          host,
          key: indexNowKey,
          keyLocation: `${base}/indexnow.txt`,
          urlList: [articleUrl, sitemapUrl],
        }),
        cache: 'no-store',
      });
      if (res.ok || res.status === 202) {
        details.push('IndexNow (Bing/Yandex): ارسال شد');
      } else {
        details.push(`IndexNow: پاسخ ${res.status}`);
      }
    } catch (e) {
      details.push(`IndexNow: ${e instanceof Error ? e.message : 'خطا'}`);
    }
  } else {
    details.push('IndexNow: کلید تنظیم نشده — در تنظیمات سایت یا INDEXNOW_KEY فعال کنید');
  }

  try {
    const bingRes = await fetch(`https://www.bing.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`, {
      cache: 'no-store',
    });
    if (bingRes.ok) details.push('Bing sitemap ping: موفق');
    else details.push(`Bing sitemap ping: ${bingRes.status}`);
  } catch {
    details.push('Bing sitemap ping: ناموفق');
  }

  const ok = details.some((d) => d.includes('موفق') || d.includes('ارسال شد') || d.includes('به‌روز شد'));
  return {
    ok,
    message: ok
      ? 'خزنده‌ها از انتشار مطلع شدند — sitemap به‌روز و درخواست ایندکس ارسال شد.'
      : 'مقاله ذخیره شد؛ اطلاع‌رسانی به موتور جستجو محدود بود.',
    details,
  };
}
