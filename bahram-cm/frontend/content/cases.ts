import type { CaseContent } from './types';

// [نمونه] before/after cases. Replace with real, consented patient cases.
export const cases: CaseContent[] = [
  {
    slug: 'implant-full-arch-01',
    title: 'بازسازی کامل لبخند با ایمپلنت',
    service: 'implant',
    serviceLabel: 'ایمپلنت',
    summary: 'جایگزینی چند دندان از دست‌رفته با ایمپلنت و روکش سرامیکی.',
    duration: '۸ هفته',
    before: '/storage/media/site/social-01.jpg',
    after: '/storage/media/site/social-02.jpg',
    tags: ['ایمپلنت'],
  },
  {
    slug: 'laminate-smile-design-01',
    title: 'طراحی لبخند با لمینت ای‌مکس',
    service: 'laminate',
    serviceLabel: 'لمینت',
    summary: 'اصلاح رنگ و فرم دندان‌ها با ۸ واحد لمینت سرامیکی و نتیجه‌ای طبیعی.',
    duration: '۳ جلسه',
    before: '/storage/media/site/social-03.jpg',
    after: '/storage/media/site/social-04.jpg',
    tags: ['لمینت', 'طراحی لبخند'],
  },
  {
    slug: 'composite-quick-smile-01',
    title: 'اصلاح سریع لبخند با کامپوزیت',
    service: 'cosmetic',
    serviceLabel: 'کامپوزیت',
    summary: 'بستن فاصله و اصلاح فرم با کامپوزیت ونیر در یک جلسه.',
    duration: '۱ جلسه',
    before: '/storage/media/site/social-01.jpg',
    after: '/storage/media/site/social-02.jpg',
    tags: ['کامپوزیت', 'زیبایی'],
  },
  {
    slug: 'bleaching-01',
    title: 'سفیدسازی تخصصی دندان',
    service: 'cosmetic',
    serviceLabel: 'بلیچینگ',
    summary: 'بلیچینگ مطبی با نتیجه روشن‌تر و یکدست.',
    duration: '۱ جلسه',
    before: '/storage/media/site/social-03.jpg',
    after: '/storage/media/site/social-04.jpg',
    tags: ['بلیچینگ', 'زیبایی'],
  },
  {
    slug: 'implant-single-01',
    title: 'ایمپلنت تک‌واحدی ناحیه قدامی',
    service: 'implant',
    serviceLabel: 'ایمپلنت',
    summary: 'کاشت یک واحد ایمپلنت با روکش هماهنگ با دندان‌های طبیعی.',
    duration: '۶ هفته',
    before: '/storage/media/site/social-01.jpg',
    after: '/storage/media/site/social-02.jpg',
    tags: ['ایمپلنت', 'زیبایی'],
  },
  {
    slug: 'laminate-08-units-01',
    title: 'لمینت ۸ واحد فک بالا',
    service: 'laminate',
    serviceLabel: 'لمینت',
    summary: 'یکدست شدن رنگ و فرم دندان‌ها با لمینت سرامیکی.',
    duration: '۳ جلسه',
    before: '/storage/media/site/social-03.jpg',
    after: '/storage/media/site/social-04.jpg',
    tags: ['لمینت', 'زیبایی'],
  },
];

export const caseFilters = [
  { value: 'all', label: 'همه' },
  { value: 'implant', label: 'ایمپلنت' },
  { value: 'laminate', label: 'لمینت' },
  { value: 'cosmetic', label: 'زیبایی' },
];

export const getCase = (slug: string) => cases.find((c) => c.slug === slug);

/** Homepage showcase: up to six cases in three stacked columns (two per column). */
export function pickHomepageCases(list: CaseContent[]): CaseContent[] {
  const laminate = list.find((c) => c.slug === 'laminate-smile-design-01');
  const stackedSecond =
    list.find((c) => c.slug === 'implant-single-01') ??
    list.find((c) => c.service === 'implant' && c.slug !== laminate?.slug) ??
    list[1];
  const used = new Set([laminate?.slug, stackedSecond?.slug].filter(Boolean));
  const rest = list.filter((c) => !used.has(c.slug));
  const ordered = [laminate, stackedSecond, ...rest].filter(Boolean) as CaseContent[];
  return ordered.slice(0, 6);
}

/** Local placeholder images for before/after sliders (by case index). */
export function caseSampleImages(index: number): { before: string; after: string } {
  const pair = index % 2;
  return pair === 0
    ? { before: '/storage/media/site/social-01.jpg', after: '/storage/media/site/social-02.jpg' }
    : { before: '/storage/media/site/social-03.jpg', after: '/storage/media/site/social-04.jpg' };
}

export function resolveCaseImages(slug: string, index = 0): { before: string; after: string } {
  const match = cases.find((c) => c.slug === slug);
  if (match) return { before: match.before, after: match.after };
  return caseSampleImages(index);
}
