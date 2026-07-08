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
  /** True when article has no title/body/meta to score yet */
  notStarted?: boolean;
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

function articleHasSeoContent(input: {
  title: string;
  excerpt?: string;
  body?: string;
  metaTitle: string;
  metaDescription: string;
}): boolean {
  const title = (input.metaTitle || input.title || '').trim();
  const excerpt = (input.excerpt ?? '').trim();
  const desc = (input.metaDescription || '').trim();
  const bodyWords = countWords(stripHtml(input.body ?? ''));
  return title.length > 0 || excerpt.length > 0 || desc.length > 0 || bodyWords > 0;
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
}

const SEO_SCORE_RED_HUE = 6;
const SEO_SCORE_GREEN_HUE = 152;
const SEO_SCORE_RED_MAX = 40;

function scoreHue(score: number): number {
  const s = clampScore(score);
  if (s <= SEO_SCORE_RED_MAX) return SEO_SCORE_RED_HUE;

  const t = (s - SEO_SCORE_RED_MAX) / (100 - SEO_SCORE_RED_MAX);
  const smooth = t * t * (3 - 2 * t);
  return SEO_SCORE_RED_HUE + smooth * (SEO_SCORE_GREEN_HUE - SEO_SCORE_RED_HUE);
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

  if (!articleHasSeoContent(input)) {
    const html = parseHtmlStats(input.body ?? '');
    const stats: SeoArticleStats = {
      wordCount: 0,
      readingMinutes: 0,
      h2Count: html.h2Count,
      h3Count: html.h3Count,
      internalLinks: html.internalLinks,
      externalLinks: html.externalLinks,
      imageCount: html.imageCount,
      imagesWithAlt: html.imagesWithAlt,
      keywordCount: 0,
      keywordDensity: 0,
      titleLength: title.length,
      descLength: desc.length,
      slugLength: input.slug.length,
    };

    return {
      score: 0,
      notStarted: true,
      grade: 'poor',
      checks: [
        {
          id: 'not-started',
          group: 'content',
          label: 'شروع نوشتن',
          status: 'bad',
          hint: 'با نوشتن عنوان یا متن مقاله، امتیاز سئو محاسبه می‌شود',
        },
      ],
      stats,
    };
  }

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
      status: !kw ? 'ok' : statusFrom(inTitle),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inTitle
          ? 'کلمه کلیدی در meta title هست'
          : 'کلمه کلیدی را نزدیک ابتدای عنوان SEO بگذارید',
    },
    {
      id: 'first-para-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در پاراگراف اول',
      status: !kw ? 'ok' : statusFrom(inFirstPara),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inFirstPara
          ? 'GEO: کلمه کلیدی در ابتدای مقاله هست'
          : 'برای GEO، کلمه کلیدی را در پاراگراف اول بگنجانید',
    },
    {
      id: 'h2-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در یک H2',
      status: !kw ? 'ok' : statusFrom(inH2),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inH2
          ? 'کلمه کلیدی در یکی از عناوین H2 هست'
          : 'کلمه کلیدی را در حداقل یک H2 استفاده کنید',
    },
    {
      id: 'desc-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در Meta Description',
      status: !kw ? 'ok' : statusFrom(inDesc),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inDesc
          ? 'کلمه کلیدی در توضیحات متا هست'
          : 'کلمه کلیدی را یک‌بار در meta description بگنجانید',
    },
    {
      id: 'slug-kw',
      group: 'keyword',
      label: 'اسلاگ مرتبط با کلمه کلیدی',
      status: !kw ? 'ok' : statusFrom(inSlug),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inSlug
          ? 'اسلاگ با کلمه کلیدی هم‌خوان است'
          : 'اسلاگ لاتین نزدیک کلمه کلیدی تنظیم کنید',
    },
    {
      id: 'density',
      group: 'keyword',
      label: 'تراکم کلمه کلیدی',
      status: !kw ? 'ok' : statusFrom(keywordDensity >= 0.4 && keywordDensity <= 2.5, keywordDensity > 0),
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
  const score = clampScore((checks.reduce((s, c) => s + weights[c.status], 0) / checks.length) * 100);

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

/** Live SEO scoring for static site pages (admin meta editor). */
export function scorePageSeo(input: {
  pageLabel: string;
  pagePath: string;
  focusKeyword?: string | null;
  metaTitle: string;
  metaDescription: string;
  canonical?: string | null;
  robots?: string;
}): SeoScoreResult {
  const kw = (input.focusKeyword ?? '').trim();
  const title = input.metaTitle || input.pageLabel || '';
  const desc = input.metaDescription || '';
  const kwLower = kw.toLowerCase();
  const titleLower = title.toLowerCase();
  const descLower = desc.toLowerCase();
  const pathLower = input.pagePath.toLowerCase();

  const inTitle = kw ? titleLower.includes(kwLower) : false;
  const inDesc = kw ? descLower.includes(kwLower) : false;
  const inPath = kw
    ? pathLower.includes(kwLower.replace(/\s+/g, '-')) || pathLower.includes(kwLower.replace(/\s+/g, ''))
    : false;

  const titleLen = title.length;
  const descLen = desc.length;
  const isIndexable = !input.robots || /index/i.test(input.robots);
  const canonical = (input.canonical ?? '').trim();
  let canonicalValid = false;
  if (canonical) {
    try {
      const parsed = new URL(canonical);
      canonicalValid = parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      canonicalValid = false;
    }
  }

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
      status: !kw ? 'ok' : statusFrom(inTitle),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inTitle
          ? 'کلمه کلیدی در meta title هست'
          : 'کلمه کلیدی را نزدیک ابتدای عنوان SEO بگذارید',
    },
    {
      id: 'desc-kw',
      group: 'keyword',
      label: 'کلمه کلیدی در Meta Description',
      status: !kw ? 'ok' : statusFrom(inDesc),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inDesc
          ? 'کلمه کلیدی در توضیحات متا هست'
          : 'کلمه کلیدی را یک‌بار در meta description بگنجانید',
    },
    {
      id: 'path-kw',
      group: 'keyword',
      label: 'مسیر URL مرتبط',
      status: !kw ? 'ok' : statusFrom(inPath),
      hint: !kw
        ? 'پس از تعیین کلمه کلیدی بررسی می‌شود'
        : inPath
          ? 'مسیر صفحه با کلمه کلیدی هم‌خوان است'
          : 'در صورت امکان مسیر صفحه را نزدیک کلمه کلیدی نگه دارید',
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
      id: 'robots',
      group: 'technical',
      label: 'ایندکس در موتور جستجو',
      status: statusFrom(isIndexable),
      hint: isIndexable ? 'robots: index — قابل ایندکس' : 'robots روی noindex است — برای انتشار index,follow بگذارید',
    },
    {
      id: 'canonical',
      group: 'technical',
      label: 'Canonical URL',
      status: statusFrom(!canonical || canonicalValid, Boolean(canonical)),
      hint: canonical
        ? canonicalValid
          ? 'آدرس canonical معتبر است'
          : 'آدرس canonical باید با http:// یا https:// شروع شود'
        : 'canonical خالی است — پیش‌فرض همان URL صفحه است',
    },
    {
      id: 'page-label',
      group: 'content',
      label: 'عنوان صفحه در متا',
      status: statusFrom(Boolean(title.trim())),
      hint: title.trim() ? `عنوان: ${title.trim()}` : 'Meta Title را پر کنید',
    },
    {
      id: 'page-desc',
      group: 'content',
      label: 'توضیحات snippet',
      status: statusFrom(descLen >= 100, descLen >= 60),
      hint:
        descLen >= 100
          ? `${descLen} کاراکتر — مناسب snippet گوگل`
          : 'توضیحات ۱۰۰+ کاراکتر برای CTR بهتر بنویسید',
    },
  ];

  const weights = { good: 1, ok: 0.55, bad: 0 };
  const score = clampScore((checks.reduce((s, c) => s + weights[c.status], 0) / checks.length) * 100);

  const grade: SeoScoreResult['grade'] =
    score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  const stats: SeoArticleStats = {
    wordCount: countWords(desc),
    readingMinutes: 1,
    h2Count: 0,
    h3Count: 0,
    internalLinks: 0,
    externalLinks: 0,
    imageCount: 0,
    imagesWithAlt: 0,
    keywordCount: kw ? (inTitle ? 1 : 0) + (inDesc ? 1 : 0) + (inPath ? 1 : 0) : 0,
    keywordDensity: 0,
    titleLength: titleLen,
    descLength: descLen,
    slugLength: input.pagePath.length,
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

/** Smooth red → green panel surface for admin SEO score card */
export function seoScoreSurfaceStyle(score: number, isDark = false): { backgroundColor: string; borderColor: string } {
  if (score <= 0) {
    return isDark
      ? { backgroundColor: 'hsl(220 8% 13%)', borderColor: 'hsl(220 8% 22%)' }
      : { backgroundColor: 'hsl(220 25% 97%)', borderColor: 'hsl(220 18% 88%)' };
  }

  const hue = scoreHue(score);
  return isDark
    ? {
        backgroundColor: `hsl(${hue} 28% 14%)`,
        borderColor: `hsl(${hue} 38% 26%)`,
      }
    : {
        backgroundColor: `hsl(${hue} 68% 96%)`,
        borderColor: `hsl(${hue} 52% 84%)`,
      };
}

export function seoScoreTextStyle(score: number, isDark = false): { color: string } {
  if (score <= 0) {
    return { color: isDark ? 'hsl(220 8% 62%)' : 'hsl(220 12% 52%)' };
  }

  const hue = scoreHue(score);
  return { color: isDark ? `hsl(${hue} 48% 68%)` : `hsl(${hue} 58% 36%)` };
}

export function seoScoreBarStyle(score: number): { backgroundColor: string; width: string } {
  const hue = scoreHue(Math.max(score, 4));
  return {
    backgroundColor: `hsl(${hue} 62% 46%)`,
    width: `${clampScore(score)}%`,
  };
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
