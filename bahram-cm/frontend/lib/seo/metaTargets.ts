import { site } from '@/content/site';

export interface SeoMetaTarget {
  type: 'page';
  id: string;
  label: string;
  path: string;
}

function pathToId(path: string): string {
  if (path === '/') return 'home';
  return path.replace(/^\//, '').replace(/\//g, '-');
}

/** Internal site pages editable from admin SEO meta panel. */
export const SEO_META_TARGETS: SeoMetaTarget[] = (() => {
  const entries = new Map<string, string>();

  entries.set('/', 'صفحه اصلی');

  for (const link of site.nav) {
    if (link.href.startsWith('/')) entries.set(link.href, link.label);
  }

  const extras: [string, string][] = [
    ['/academy', 'آکادمی'],
    ['/academy/app', 'اپ آکادمی'],
    ['/events', 'رویدادها'],
    ['/legal/privacy', 'حریم خصوصی'],
    ['/legal/terms', 'قوانین و مقررات'],
    ['/legal/cookies', 'کوکی‌ها'],
    ['/legal/data-request', 'درخواست داده'],
  ];

  for (const [path, label] of extras) {
    if (!entries.has(path)) entries.set(path, label);
  }

  const order = [
    '/',
    '/course/campaign-writing',
    '/courses',
    '/mini-courses',
    '/saat',
    '/academy',
    '/academy/app',
    '/insights',
    '/articles',
    '/guides',
    '/resources',
    '/transformations',
    '/events',
    '/founder',
    '/contact',
    '/faq',
    '/legal/privacy',
    '/legal/terms',
    '/legal/cookies',
    '/legal/data-request',
  ];

  const sorted = [...entries.entries()].sort((a, b) => {
    const ai = order.indexOf(a[0]);
    const bi = order.indexOf(b[0]);
    if (ai === -1 && bi === -1) return a[1].localeCompare(b[1], 'fa');
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  return sorted.map(([path, label]) => ({
    type: 'page' as const,
    id: pathToId(path),
    label,
    path,
  }));
})();

export const SEO_PREVIEW_DOMAIN = site.domain;
