import type { AiSiteContext } from './siteContext';
import {
  formatCategorySection,
  formatLinkSection,
  formatRelatedArticlesSection,
  type LinkOption,
  type RelatedArticleOption,
} from './articlePromptSections';

export type { LinkOption, RelatedArticleOption };

export interface ArticlePromptInput {
  topic: string;
  description: string;
  keyword?: string;
  clinic?: string;
  selectedLinks?: LinkOption[];
  relatedArticles?: RelatedArticleOption[];
  categoryName?: string;
}

/** SEO + HTML rules injected into every article-generation system prompt. */
export const ARTICLE_SEO_RULES = `
SEO REQUIREMENTS (mandatory — follow exactly):
1. focusKeyword: one primary Persian keyword; use naturally in title, first paragraph, at least one H2, seo.title, and seo.description.
2. seo.title: max 60 characters, compelling, includes focusKeyword near the start, brand "بهرام" optional at end.
3. seo.description: 120–160 characters, includes focusKeyword once, clear benefit + soft CTA.
4. slug: latin kebab-case (transliterate Persian topic if needed), short, readable, keyword-related.
5. Body HTML structure:
   - Use only h2 and h3 for headings (NO h1 in body — page title is h1).
   - 5–7 sections with h2; use h3 for subsections where helpful.
   - Every <img> MUST have a descriptive Persian alt attribute (include focusKeyword only when natural).
   - Use <strong> for emphasis sparingly; lists with ul/ol/li where useful.
6. Internal links: 4–6 contextual <a href="/relative-path"> with descriptive Persian anchor text (paths from internalLinkTargets only).
7. seoKeywords: array of 3–8 related Persian keywords/long-tail phrases for this article.
8. htmlOutline: { "h2": ["..."], "h3": ["..."] } — planned headings before writing (must match body).
9. imageAlts: [{ "context": "where image appears", "alt": "Persian alt text" }] — one entry per img in body.

Return JSON only with keys:
title, slug, excerpt, body (HTML string), reading_time (Persian e.g. "۷ دقیقه"), focusKeyword, category (Persian blog category — REQUIRED, match user prompt category), seoKeywords (string[]), htmlOutline ({ h2: string[], h3: string[] }), imageAlts ({ context: string, alt: string }[]), seo ({ title, description }).
`.trim();

export const ARTICLE_GEO_RULES = `
GEO — Generative Engine Optimization (for Google AI Overviews, ChatGPT, Perplexity, etc.):
1. First paragraph: direct 2–3 sentence answer to the main reader question (featured-snippet / AI-citation style).
2. At least one h2 phrased as a real question (e.g. «چطور برای سات آماده شوم؟»); answer clearly in the paragraph below.
3. Concrete facts from SITE CONTEXT: course names, timelines, steps — never invent numbers or guarantees.
4. Define key terms once in plain Persian (e.g. «سات یعنی …»).
5. Scannable: short paragraphs (2–4 sentences), bullet lists, bold for key takeaways.
6. Entity consistency: بهرام رستمی / آکادمی بهرام + course/service names repeated naturally.
7. Optional h2 «سوالات متداول» with 2–4 pairs of h3 (question) + p (concise answer).
8. excerpt field: standalone 2–3 sentence summary that AI engines can quote — include focusKeyword once.
`.trim();

export const ARTICLE_CONTENT_QUALITY = `
CONTENT QUALITY (mandatory):
- Write for real learners and professionals: empathetic, expert, actionable — zero generic filler or repetition.
- Each h2 section must add unique value; no copy-paste between sections.
- E-E-A-T: cite academy experience, courses, SAT prep, and real offerings from SITE CONTEXT.
- Natural Persian (RTL); warm professional tone — trustworthy, never salesy or exaggerated.
- Conclusion h2 with soft CTA linking to /apply or /courses or تماس — no pressure language.
- Length: 1000–1500 words in body HTML (excluding related-articles block).
`.trim();

export const ARTICLE_RELATED_BLOCK = `
RELATED ARTICLES BLOCK (mandatory — last section inside body HTML):
- Final h2: «مقالات مرتبط» (or «ادامه مطلب در insights بهرام»).
- Include 3–5 blog posts from RELATED BLOG ARTICLES in the user message (or blogArticles in SITE CONTEXT).
- Format each as:
  <li><a href="/insights/{slug}">{title}</a> — {1–2 sentence Persian summary adapted from excerpt}</li>
  wrapped in <ul> inside the h2 section.
- Pick posts topically related to the article; summaries must be original, not copy-paste excerpt verbatim.
- Do NOT skip this block — it is required for internal linking and SEO.
`.trim();

export function buildArticleUserPrompt(input: ArticlePromptInput): string {
  const keyword = input.keyword?.trim() || input.topic.trim();
  const angle =
    input.description.trim() ||
    'مخاطبان آکادمی بهرام که به دنبال رشد حرفه‌ای، فروش، بازاریابی یا آمادگی سات هستند';

  return [
    '=== درخواست تولید مقاله ===',
    '',
    `موضوع / عنوان پیشنهادی: ${input.topic.trim()}`,
    `زاویه محتوا و مخاطب: ${angle}`,
    `کلمه کلیدی اصلی (SEO): ${keyword}`,
    input.clinic ? `برند: ${input.clinic}` : '',
    '',
    'اهداف این مقاله:',
    '✓ محتوای عالی، عمیق و کاربردی — نه متن سطحی یا تکراری',
    '✓ SEO-friendly: عنوان، meta، slug، کلمه کلیدی، ساختار h2/h3، alt تصاویر',
    '✓ GEO-friendly: پاسخ مستقیم در ابتدا، سوال‌وجواب، حقایق مشخص، excerpt قابل استناد',
    '✓ لینک‌های داخلی طبیعی در متن (۴–۶ لینک)',
    '✓ در پایان body: بخش «مقالات مرتبط» با عنوان، لینک و خلاصه هر مقاله',
    '✓ دسته‌بندی مقاله در فیلد category',
    '',
    'Apply all SEO, GEO, HTML, content-quality and related-articles rules from the system message.',
    'Output valid JSON only — no markdown fences.',
    input.selectedLinks?.length ? formatLinkSection(input.selectedLinks) : '',
    input.relatedArticles?.length ? formatRelatedArticlesSection(input.relatedArticles) : '',
    input.categoryName ? formatCategorySection(input.categoryName) : '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildAiArticleSystemPrompt(context: AiSiteContext): string {
  const categoryHint =
    context.blogArticles.length > 0
      ? `Available blog posts for related-articles block: ${context.blogArticles.length} articles in blogArticles.`
      : '';

  return [
    `You are an expert Persian content writer for "${context.brand.name}" academy and personal brand in ${context.brand.city}.`,
    'Your articles rank in Google AND get cited by AI answer engines (GEO).',
    'Tone: trustworthy, warm, expert — never salesy or exaggerated. RTL-friendly Persian.',
    '',
    'SITE CONTEXT (ground truth — use for accurate services, prices, internal links, blog posts, and brand facts):',
    JSON.stringify(context),
    '',
    categoryHint,
    '',
    'ARTICLE STRUCTURE:',
    '- Intro: direct answer to main question (GEO snippet).',
    '- 5–7 h2 sections with depth; h3 subsections where helpful.',
    '- Internal links: 4–6 contextual <a href="/..."> ONLY to paths from internalLinkTargets.',
    '- Link to relevant pages (/courses, /saat, /academy, /apply, /insights, related blog posts).',
    '- Use real course names and offerings from context — never invent prices or guarantees.',
    '- Mention academy trust signals (experience, methodology, results) when relevant.',
    '- Final section in body: «مقالات مرتبط» with linked titles + summaries (see RELATED ARTICLES BLOCK).',
    '- HTML body tags: h2, h3, p, ul, ol, li, a, strong, em, blockquote, img, figure, figcaption. No script/style/iframe.',
    '',
    ARTICLE_CONTENT_QUALITY,
    '',
    ARTICLE_GEO_RULES,
    '',
    ARTICLE_RELATED_BLOCK,
    '',
    ARTICLE_SEO_RULES,
  ].join('\n');
}
