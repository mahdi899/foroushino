export interface SeoCheck {
  id: string;
  label: string;
  status: 'good' | 'ok' | 'bad';
  hint: string;
  group: 'keyword' | 'content' | 'technical' | 'links' | 'media';
}

export interface SeoArticleStats {
  wordCount: number;
  readingMinutes: number;
  h2Count: number;
  h3Count: number;
  internalLinks: number;
  externalLinks: number;
  imageCount: number;
  imagesWithAlt: number;
  keywordCount: number;
  keywordDensity: number;
  titleLength: number;
  descLength: number;
  slugLength: number;
}

export interface SeoScoreResult {
  score: number;
  checks: SeoCheck[];
  stats: SeoArticleStats;
  grade: 'excellent' | 'good' | 'fair' | 'poor';
}

function statusFrom(ok: boolean, warn?: boolean): SeoCheck['status'] {
  if (ok) return 'good';
  if (warn) return 'ok';
  return 'bad';
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

function countKeyword(text: string, keyword: string): number {
  if (!keyword.trim() || !text) return 0;
  const escaped = keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(escaped, 'gi');
  return (text.match(re) ?? []).length;
}

function firstParagraphText(html: string): string {
  const match = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (match) return stripHtml(match[1]);
  return stripHtml(html).slice(0, 280);
}

function parseHtmlStats(html: string) {
  const h2Count = (html.match(/<h2[\s>]/gi) ?? []).length;
  const h3Count = (html.match(/<h3[\s>]/gi) ?? []).length;
  const hasH1 = /<h1[\s>]/i.test(html);
  const imgTags = html.match(/<img[^>]*>/gi) ?? [];
  const imagesWithAlt = imgTags.filter((tag) => {
    const alt = tag.match(/\balt=["']([^"']*)["']/i)?.[1]?.trim();
    return Boolean(alt);
  }).length;
  const anchorTags = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*>/gi) ?? [];
  let internalLinks = 0;
  let externalLinks = 0;
  for (const tag of anchorTags) {
    const href = tag.match(/href=["']([^"']+)["']/i)?.[1] ?? '';
    if (!href || href.startsWith('#')) continue;
    if (href.startsWith('/') || href.includes('bahramrostami.com') || href.includes('localhost')) internalLinks += 1;
    else if (href.startsWith('http')) externalLinks += 1;
  }
  return { h2Count, h3Count, hasH1, imageCount: imgTags.length, imagesWithAlt, internalLinks, externalLinks };
}

function isLatinSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/** Live SEO + GEO scoring for the article editor. */
export function scoreArticleSeo(input: {
  title: string;
  excerpt: string;
  body: string;
  slug: string;
  focusKeyword?: string | null;
  metaTitle: string;
  metaDescription: string;
  coverUrl?: string;
  categoryName?: string;
  robots?: string;
}): SeoScoreResult {
  const kw = (input.focusKeyword ?? '').trim();
  const title = input.metaTitle || input.title || '';
  const desc = input.metaDescription || input.excerpt || '';
  const bodyText = stripHtml(input.body ?? '');
  const wordCount = countWords(bodyText);
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 200));
  const kwLower = kw.toLowerCase();
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const bodyLower = bodyText.toLowerCase();
  const slugLower = input.slug.toLowerCase();

  const inTitle = kw ? titleLower.includes(kwLower) : false;
  const inDesc = kw ? descLower.includes(kwLower) : false;
  const inSlug = kw ? slugLower.includes(kwLower.replace(/\s+/g, '-')) || slugLower.includes(kwLower.replace(/\s+/g, '')) : false;
  const inBody = kw ? bodyLower.includes(kwLower) : false;
  const inFirstPara = kw ? firstParagraphText(input.body).toLowerCase().includes(kwLower) : false;
  const inH2 = kw ? (input.body.match(/<h2[^>]*>([\s\S]*?)<\/h2>/gi) ?? []).some((h) => stripHtml(h).toLowerCase().includes(kwLower)) : false;

  const keywordCount = countKeyword(bodyText, kw) + (inTitle ? 1 : 0) + (inDesc ? 1 : 0);
  const keywordDensity = kw && wordCount > 0 ? (countKeyword(bodyText, kw) / wordCount) * 100 : 0;

  const titleLen = title.length;
  const descLen = desc.length;
  const slugLen = input.slug.length;

  const html = parseHtmlStats(input.body);
  const hasRelatedBlock = /مقالات\s*مرتبط|ادامه\s*مطلب/i.test(input.body);
  const isIndexable = !input.robots || /index/i.test(input.robots);

  const checks: SeoCheck[] = [
    {
      id: 'focus',
      group: 'keyword',
      label: 'کلمه کلیدی اصلی',
      status: statusFrom(!!kw),
      hint: kw ? `Focus: «${kw}»` : 'کلمه کلیدی را در بخش SEO وارد کنید',
    },
    {
      id: 'title-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در عنوان SEO',
      status: statusFrom(!kw || inTitle, !kw),
      hint: inTitle ? 'کلمه کلیدی در meta title هست' : 'کلمه کلیدی را نزدیک ابتدای عنوان SEO بگذارید',
    },
    {
      id: 'first-para-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در پاراگراف اول',
      status: statusFrom(!kw || inFirstPara, !kw),
      hint: inFirstPara ? 'GEO: کلمه کلیدی در ابتدای مقاله هست' : 'برای GEO، کلمه کلیدی را در پاراگراف اول بگنجانید',
    },
    {
      id: 'h2-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در یک H2',
      status: statusFrom(!kw || inH2, !kw),
      hint: inH2 ? 'کلمه کلیدی در یکی از عناوین H2 هست' : 'کلمه کلیدی را در حداقل یک H2 استفاده کنید',
    },
    {
      id: 'desc-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در Meta Description',
      status: statusFrom(!kw || inDesc, !kw),
      hint: inDesc ? 'کلمه کلیدی در توضیحات متا هست' : 'کلمه کلیدی را یک‌بار در meta description بگنجانید',
    },
    {
      id: 'slug-kw',
      group: 'keyword',
      label: 'اسلاگ مرتبط با کلمه کلیدی',
      status: statusFrom(!kw || inSlug, !kw),
      hint: inSlug ? 'اسلاگ با کلمه کلیدی هم‌خوان است' : 'اسلاگ لاتین نزدیک کلمه کلیدی تنظیم کنید',
    },
    {
      id: 'density',
      group: 'keyword',
      label: 'تراکم کلمه کلیدی',
      status: statusFrom(!kw || (keywordDensity >= 0.4 && keywordDensity <= 2.5), !kw || keywordDensity > 0),
      hint: kw
        ? `${keywordDensity.toFixed(1)}٪ — هدف ۰.۵ تا ۲.۵٪ (${countKeyword(bodyText, kw)} بار در متن)`
        : 'پس از تعیین کلمه کلیدی محاسبه می‌شود',
    },
    {
      id: 'title-len',
      group: 'technical',
      label: 'طول عنوان SEO',
      status: statusFrom(titleLen >= 30 && titleLen <= 60, titleLen > 0 && titleLen <= 70),
      hint: `${titleLen} کاراکتر — هدف ۳۰–۶۰`,
    },
    {
      id: 'desc-len',
      group: 'technical',
      label: 'طول Meta Description',
      status: statusFrom(descLen >= 120 && descLen <= 160, descLen >= 80 && descLen <= 170),
      hint: `${descLen} کاراکتر — هدف ۱۲۰–۱۶۰`,
    },
    {
      id: 'slug-format',
      group: 'technical',
      label: 'فرمت اسلاگ',
      status: statusFrom(Boolean(input.slug) && isLatinSlug(input.slug), Boolean(input.slug)),
      hint: input.slug
        ? isLatinSlug(input.slug)
          ? 'اسلاگ kebab-case لاتین — مناسب URL'
          : 'اسلاگ را لاتین و kebab-case بنویسید (مثلاً sat-prep-guide)'
        : 'اسلاگ URL را تنظیم کنید',
    },
    {
      id: 'robots',
      group: 'technical',
      label: 'ایندکس در موتور جستجو',
      status: statusFrom(isIndexable),
      hint: isIndexable ? 'robots: index — قابل ایندکس' : 'robots روی noindex است — برای انتشار index,follow بگذارید',
    },
    {
      id: 'category',
      group: 'technical',
      label: 'دسته‌بندی مقاله',
      status: statusFrom(Boolean(input.categoryName?.trim())),
      hint: input.categoryName?.trim() ? `دسته: ${input.categoryName}` : 'دسته‌بندی را انتخاب کنید',
    },
    {
      id: 'content-len',
      group: 'content',
      label: 'طول محتوا',
      status: statusFrom(wordCount >= 800, wordCount >= 400),
      hint: `${wordCount} کلمه — هدف ۸۰۰+ (ایده‌آل ۱۰۰۰–۱۵۰۰)`,
    },
    {
      id: 'excerpt',
      group: 'content',
      label: 'خلاصه مقاله (Excerpt)',
      status: statusFrom((input.excerpt ?? '').trim().length >= 100, (input.excerpt ?? '').trim().length >= 60),
      hint:
        (input.excerpt ?? '').trim().length >= 100
          ? `${(input.excerpt ?? '').trim().length} کاراکتر — مناسب snippet و GEO`
          : 'خلاصه ۱۰۰+ کاراکتر برای snippet و AI citation بنویسید',
    },
    {
      id: 'headings',
      group: 'content',
      label: 'ساختار عناوین H2/H3',
      status: statusFrom(html.h2Count >= 4 && html.h2Count <= 8, html.h2Count >= 2),
      hint: `${html.h2Count} H2، ${html.h3Count} H3 — هدف ۴–۷ H2`,
    },
    {
      id: 'no-h1',
      group: 'content',
      label: 'بدون H1 در بدنه',
      status: statusFrom(!html.hasH1),
      hint: html.hasH1 ? 'H1 را از body حذف کنید — عنوان صفحه H1 است' : 'فقط h2/h3 در body — درست است',
    },
    {
      id: 'related-block',
      group: 'content',
      label: 'بلوک مقالات مرتبط',
      status: statusFrom(hasRelatedBlock, false),
      hint: hasRelatedBlock ? 'بخش مقالات مرتبط در پایان متن هست' : 'در پایان مقاله بلوک «مقالات مرتبط» با لینک /insights/... و خلاصه اضافه کنید',
    },
    {
      id: 'internal-links',
      group: 'links',
      label: 'لینک‌های داخلی',
      status: statusFrom(html.internalLinks >= 4, html.internalLinks >= 2),
      hint: `${html.internalLinks} لینک داخلی — هدف ۴–۶ لینک`,
    },
    {
      id: 'cover',
      group: 'media',
      label: 'تصویر شاخص',
      status: statusFrom(Boolean(input.coverUrl?.trim())),
      hint: input.coverUrl?.trim() ? 'تصویر شاخص تنظیم شده' : 'تصویر شاخص برای OG و CTR گوگل لازم است',
    },
    {
      id: 'img-alt',
      group: 'media',
      label: 'Alt تصاویر داخل متن',
      status: statusFrom(html.imageCount === 0 || html.imagesWithAlt === html.imageCount, html.imagesWithAlt > 0),
      hint:
        html.imageCount === 0
          ? 'بدون تصویر inline — اختیاری'
          : `${html.imagesWithAlt}/${html.imageCount} تصویر alt فارسی دارند`,
    },
  ];

  const weights = { good: 1, ok: 0.55, bad: 0 };
  const score = Math.round((checks.reduce((s, c) => s + weights[c.status], 0) / checks.length) * 100);

  const grade: SeoScoreResult['grade'] =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  const stats: SeoArticleStats = {
    wordCount,
    readingMinutes,
    h2Count: html.h2Count,
    h3Count: html.h3Count,
    internalLinks: html.internalLinks,
    externalLinks: html.externalLinks,
    imageCount: html.imageCount,
    imagesWithAlt: html.imagesWithAlt,
    keywordCount,
    keywordDensity,
    titleLength: titleLen,
    descLength: descLen,
    slugLength: slugLen,
  };

  return { score, checks, stats, grade };
}

export const SEO_CHECK_GROUPS: { id: SeoCheck['group']; label: string }[] = [
  { id: 'keyword', label: 'کلمه کلیدی' },
  { id: 'technical', label: 'فنی / متا' },
  { id: 'content', label: 'محتوا و GEO' },
  { id: 'links', label: 'لینک‌سازی' },
  { id: 'media', label: 'تصاویر' },
];

export function seoScoreColor(score: number): string {
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-error';
}

export function seoScoreBg(score: number): string {
  if (score >= 75) return 'bg-success/10 border-success/30';
  if (score >= 50) return 'bg-warning/10 border-warning/30';
  return 'bg-error/10 border-error/30';
}

export function seoGradeLabel(grade: SeoScoreResult['grade']): string {
  switch (grade) {
    case 'excellent':
      return 'عالی';
    case 'good':
      return 'خوب';
    case 'fair':
      return 'متوسط';
    case 'poor':
      return 'نیاز به بهبود';
  }
}

export function charBarStatus(length: number, min: number, max: number): 'good' | 'ok' | 'bad' {
  if (length >= min && length <= max) return 'good';
  if (length > 0 && length <= max + 15) return 'ok';
  return 'bad';
}

export function charBarColor(status: 'good' | 'ok' | 'bad'): string {
  if (status === 'good') return 'bg-success';
  if (status === 'ok') return 'bg-warning';
  return 'bg-error';
}
