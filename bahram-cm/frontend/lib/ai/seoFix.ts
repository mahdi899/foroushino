import type { SeoCheck } from '@/lib/admin/seoScore';
import type { AiSiteContext } from '@/lib/ai/siteContext';

export interface SeoFixArticleContext {
  title: string;
  excerpt: string;
  body: string;
  slug: string;
  focusKeyword: string;
  metaTitle: string;
  metaDescription: string;
  categoryName?: string;
}

export interface SeoFixPatch {
  focusKeyword?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  body?: string;
  metaTitle?: string;
  metaDescription?: string;
  robots?: string;
  categoryName?: string;
  categoryId?: number | null;
}

export interface SeoFixAiResponse {
  summary: string;
  patch: SeoFixPatch;
}

const CHECK_FIELDS: Record<string, (keyof SeoFixPatch)[]> = {
  focus: ['focusKeyword'],
  'title-kw': ['metaTitle'],
  'first-para-kw': ['body'],
  'h2-kw': ['body'],
  'desc-kw': ['metaDescription'],
  'slug-kw': ['slug'],
  density: ['body'],
  'title-len': ['metaTitle'],
  'desc-len': ['metaDescription'],
  'slug-format': ['slug'],
  'content-len': ['body'],
  excerpt: ['excerpt'],
  headings: ['body'],
  'no-h1': ['body'],
  'related-block': ['body'],
  'internal-links': ['body'],
  'img-alt': ['body'],
  category: ['categoryName'],
};

export function seoCheckNeedsAi(checkId: string): boolean {
  return checkId in CHECK_FIELDS;
}

export function getAllowedPatchFields(checkId: string): (keyof SeoFixPatch)[] {
  return CHECK_FIELDS[checkId] ?? [];
}

function formatLinkTargets(context: AiSiteContext, limit = 18): string {
  return context.internalLinkTargets.slice(0, limit).join(', ');
}

function formatBlogPosts(context: AiSiteContext, limit = 6): string {
  return context.blogArticles
    .slice(0, limit)
    .map((a) => `/insights/${a.slug} — ${a.title}`)
    .join('\n');
}

function instructionForCheck(check: SeoCheck, ctx: SeoFixArticleContext, context: AiSiteContext): string {
  const kw = ctx.focusKeyword.trim() || ctx.title.trim();
  const brand = context.brand.name;
  const linkTargets = formatLinkTargets(context);
  const blogPosts = formatBlogPosts(context);

  const map: Record<string, string> = {
    focus: `Suggest ONE primary Persian SEO focus keyword for this "${brand}" academy article about sales, courses, SAT prep, or professional growth. Base it on title: "${ctx.title}". Return focusKeyword only.`,
    'title-kw': `Rewrite metaTitle (30–60 chars) to include focus keyword «${kw}» near the start. Brand «بهرام» or «آکادمی بهرام» optional at end — never «آترین» or dental terms.`,
    'first-para-kw': `Edit body HTML: ensure the FIRST paragraph naturally includes focus keyword «${kw}» while keeping meaning. Return full updated body HTML.`,
    'h2-kw': `Edit body HTML: include focus keyword «${kw}» in at least one h2 heading naturally. Return full updated body HTML.`,
    'desc-kw': `Rewrite metaDescription (120–160 chars) to include focus keyword «${kw}» once with benefit + soft CTA (e.g. دوره، سات، درخواست دسترسی).`,
    'slug-kw': `Suggest latin kebab-case slug related to keyword «${kw}» and topic (e.g. sat-prep-guide, campaign-writing-tips). Return slug only.`,
    density: `Adjust body HTML so focus keyword «${kw}» appears naturally 0.5–2.5% density — add or reduce usage without keyword stuffing. Return full updated body HTML.`,
    'title-len': `Adjust metaTitle to 30–60 Persian characters — compelling for ${brand}, includes keyword if possible.`,
    'desc-len': `Adjust metaDescription to 120–160 Persian characters with keyword and soft CTA toward /apply or /courses.`,
    'slug-format': `Fix slug to latin kebab-case (a-z, 0-9, hyphens only), short and SEO-friendly — no Persian characters.`,
    'content-len': `Expand body HTML to at least 800 words with valuable Persian content about academy topics (h2 sections, lists). Keep existing good parts. Return full updated body HTML.`,
    excerpt: `Write excerpt 100–160 Persian characters — snippet-ready for GEO/AI citation, includes focus keyword once if set: «${kw}».`,
    headings: `Improve body HTML structure: add h2/h3 sections to reach 4–7 h2 headings total. Return full updated body HTML.`,
    'no-h1': `Remove any h1 tags from body HTML — convert to h2 if needed. Return full updated body HTML.`,
    'related-block': `Add final section h2 «مقالات مرتبط» with <ul><li> entries linking to REAL blog posts from this list (use /insights/{slug}):\n${blogPosts || '/insights — pick related topics from site'}\nEach li: <a href="/insights/...">title</a> — 1–2 sentence Persian summary. Return full updated body HTML.`,
    'internal-links': `Add 4–6 contextual internal links in body HTML using ONLY these paths:\n${linkTargets}\nUse descriptive Persian anchor text about courses, SAT, campaign writing, apply. Never link to /blog/, /implant, /consultation, /pricing, or dental pages. Return full updated body HTML.`,
    'img-alt': `Fix all img tags in body HTML — add descriptive Persian alt about academy/course context. Return full updated body HTML.`,
    category: `Pick the best Persian blog category name from the available categories list for this academy article topic.`,
  };

  return map[check.id] ?? `Fix SEO issue: ${check.label}. Hint: ${check.hint}`;
}

export function buildSeoFixSystemPrompt(context: AiSiteContext): string {
  const sitemapSummary = context.sitemap
    .slice(0, 14)
    .map((p) => `${p.path} (${p.label})`)
    .join('; ');

  return [
    `You are an expert Persian SEO + GEO editor for "${context.brand.name}" — ${context.brand.tagline}.`,
    `City: ${context.brand.city}. Academy topics: sales training, campaign writing, courses, SAT (سات) exam prep, professional growth.`,
    'This is NOT a dental clinic — never mention implants, dentists, آترین, or medical treatment.',
    'Fix ONLY the requested SEO issue. Preserve article quality and natural Persian.',
    'Return valid JSON only with keys: summary (Persian, 1–2 sentences explaining the fix), patch (object with only changed fields).',
    'Allowed patch fields: focusKeyword, metaTitle, metaDescription, slug, excerpt, body.',
    'For body: return complete HTML using h2, h3, p, ul, ol, li, a, strong, img — no h1, no script.',
    'Blog articles live at /insights/{slug} — never /blog/.',
    'Internal links: ONLY paths from internalLinkTargets in SITE CONTEXT.',
    'Do not invent prices, guarantees, or course details not in SITE CONTEXT.',
    '',
    'SITE CONTEXT (ground truth for links and brand facts):',
    JSON.stringify({
      brand: context.brand,
      sitemap: context.sitemap,
      services: context.services.slice(0, 8),
      blogArticles: context.blogArticles.slice(0, 12),
      internalLinkTargets: context.internalLinkTargets,
    }),
    '',
    `Key pages: ${sitemapSummary}`,
  ].join('\n');
}

export function buildSeoFixUserPrompt(
  check: SeoCheck,
  ctx: SeoFixArticleContext,
  categories?: { id: number; name: string }[],
  context?: AiSiteContext,
): string {
  const allowed = getAllowedPatchFields(check.id);
  const siteCtx =
    context ??
    ({
      brand: { name: 'بهرام رستمی', tagline: 'آکادمی بهرام', city: 'تهران' },
      internalLinkTargets: ['/courses', '/saat', '/apply', '/insights', '/founder', '/course/campaign-writing'],
      blogArticles: [],
      sitemap: [],
      services: [],
    } as unknown as AiSiteContext);

  return [
    `SEO CHECK TO FIX: ${check.label} (id: ${check.id})`,
    `Status hint: ${check.hint}`,
    '',
    instructionForCheck(check, ctx, siteCtx),
    '',
    'Return patch with ONLY these fields if changed: ' + allowed.join(', '),
    '',
    'CURRENT ARTICLE:',
    JSON.stringify({
      title: ctx.title,
      excerpt: ctx.excerpt,
      slug: ctx.slug,
      focusKeyword: ctx.focusKeyword,
      metaTitle: ctx.metaTitle,
      metaDescription: ctx.metaDescription,
      categoryName: ctx.categoryName,
      bodyLength: ctx.body.length,
      body: ctx.body.length > 14000 ? `${ctx.body.slice(0, 14000)}…[truncated]` : ctx.body,
    }),
    categories?.length ? `\nAvailable categories: ${categories.map((c) => c.name).join(', ')}` : '',
  ].join('\n');
}

/** Local fixes that do not need AI. */
export function localSeoFix(
  checkId: string,
  _ctx: SeoFixArticleContext,
  categories?: { id: number; name: string }[],
): SeoFixAiResponse | null {
  if (checkId === 'robots') {
    return {
      summary: 'robots به index,follow تغییر می‌کند تا مقاله در گوگل ایندکس شود.',
      patch: { robots: 'index,follow' },
    };
  }
  return null;
}

export function pickPatchFields(raw: Record<string, unknown>, checkId: string): SeoFixPatch {
  const allowed = new Set<string>([...getAllowedPatchFields(checkId), 'robots', 'categoryName', 'categoryId']);
  const patch: SeoFixPatch = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!allowed.has(key) || value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim()) {
      (patch as Record<string, string>)[key] = value.trim();
    }
    if (key === 'categoryId' && typeof value === 'number') {
      patch.categoryId = value;
    }
  }
  return patch;
}
