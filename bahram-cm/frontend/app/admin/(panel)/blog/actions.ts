'use server';



import { persistMediaUrl } from '@/lib/mediaUrl';
import { aiChatCompletion } from '@/lib/ai/client';

import { generateAiImage } from '@/lib/ai/images';

import { buildAiArticleSystemPrompt, buildArticleUserPrompt } from '@/lib/ai/articlePrompt';
import type { AiArticleResult, ArticleLinkOption, ArticlePromptPreview } from '@/lib/admin/blogAiTypes';

import {
  buildSeoFixSystemPrompt,
  buildSeoFixUserPrompt,
  localSeoFix,
  pickPatchFields,
  seoCheckNeedsAi,
  type SeoFixAiResponse,
  type SeoFixArticleContext,
} from '@/lib/ai/seoFix';

import type { SeoCheck } from '@/lib/admin/seoScore';

import { buildSiteContextForAi } from '@/lib/ai/siteContext';

import { getResolvedAiRuntime } from '@/lib/ai/settings';

import { adminFetch } from '@/lib/auth/session';

import type { ApiCategory } from '@/lib/api/types';

function slugifyFa(text: string): string {

  return text

    .trim()

    .toLowerCase()

    .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, '')

    .replace(/\s+/g, '-')

    .replace(/-+/g, '-')

    .slice(0, 80);

}



function fallbackArticle(topic: string, description: string, keyword?: string): AiArticleResult {

  const kw = keyword?.trim() || topic.trim();

  const title = topic.trim() || 'مقاله جدید آکادمی بهرام';

  const excerpt =
    description.trim() ||
    `در این مقاله درباره ${kw} برای مخاطبان آکادمی بهرام توضیح می‌دهیم: مسیر یادگیری، نکات عملی و گام‌های بعدی.`;

  const body = `<h2>${kw} چیست؟</h2>
<p>${excerpt}</p>
<h2>چرا آکادمی بهرام؟</h2>
<ul>
<li>محتوای عملی و قابل اجرا</li>
<li>مسیر یادگیری شفاف برای فروش، بازاریابی و سات</li>
<li>همراهی در رشد حرفه‌ای</li>
</ul>
<h2>گام‌های پیشنهادی</h2>
<p>با توجه به هدف خود، دوره یا مسیر مناسب را انتخاب کنید. برای مشاوره می‌توانید از <a href="/apply">ثبت‌نام آکادمی</a> استفاده کنید.</p>
<h2>جمع‌بندی</h2>
<p>برای اطلاعات بیشتر به <a href="/courses">دوره‌ها</a> یا <a href="/insights">insights</a> سر بزنید.</p>`;

  return {
    title,
    slug: slugifyFa(title),
    excerpt,
    body,
    reading_time: '۶ دقیقه',
    focusKeyword: kw,
    seo: {
      title: `${title} | بهرام رستمی`,
      description: excerpt.slice(0, 155),
    },
  };

}



function insertInlineImage(body: string, url: string, alt: string): string {

  const storageUrl = persistMediaUrl(url) || url;
  const figure = `<figure class="my-6"><img src="${storageUrl}" alt="${alt.replace(/"/g, '&quot;')}" class="rounded-lg max-w-full h-auto" /><figcaption class="mt-2 text-center text-caption text-text-muted">${alt}</figcaption></figure>`;

  const h2Close = body.indexOf('</h2>');

  if (h2Close >= 0) return `${body.slice(0, h2Close + 5)}${figure}${body.slice(h2Close + 5)}`;

  return `${figure}${body}`;

}



function resolveCategoryId(name: string | undefined, categories: ApiCategory[]): number | null {

  if (!name?.trim()) return null;

  const normalized = name.trim();

  const match =

    categories.find((c) => c.name === normalized) ??

    categories.find((c) => c.name.includes(normalized) || normalized.includes(c.name));

  return match?.id ?? null;

}



export async function getBlogCategories(): Promise<ApiCategory[]> {

  try {

    const res = await adminFetch<{ data: ApiCategory[] }>('/categories', { query: { 'filter.type': 'blog' } });

    return res.data;

  } catch {

    return [];

  }

}



export async function generateImageForArticle(input: {

  prompt: string;

  purpose: 'cover' | 'inline';

}): Promise<{ ok: true; url: string } | { ok: false; error: string }> {

  return generateAiImage({ prompt: input.prompt, purpose: input.purpose, alt: input.prompt });

}



export async function getAiImageSettingsPreview(): Promise<{

  engine: string;

  engineLabel: string;

  model: string;

}> {

  const { getResolvedImageSettings } = await import('@/lib/ai/settings');

  const { AI_IMAGE_ENGINES } = await import('@/lib/ai/types');

  const settings = await getResolvedImageSettings();

  const engineLabel = AI_IMAGE_ENGINES.find((e) => e.id === settings.engine)?.label ?? settings.engine;

  return { engine: settings.engine, engineLabel, model: settings.model };

}



export async function getAiArticleStatus(): Promise<{

  enabled: boolean;

  configured: boolean;

  provider: string;

  keySource: 'panel' | 'env' | 'none';

  sitePages: number;

}> {

  const [runtime, context] = await Promise.all([getResolvedAiRuntime(), buildSiteContextForAi()]);

  return {

    enabled: runtime.enabled,

    configured: Boolean(runtime.active.apiKey),

    provider: runtime.provider,

    keySource: runtime.keySource,

    sitePages: context.sitemap.length,

  };

}



export async function previewArticleAiPrompt(input: {

  topic: string;

  description: string;

  keyword?: string;

  selectedLinkPaths?: string[];

  categoryName?: string;

}): Promise<{ ok: true; data: ArticlePromptPreview } | { ok: false; error: string }> {

  const topic = input.topic.trim();

  if (!topic) return { ok: false, error: 'عنوان یا موضوع مقاله را وارد کنید.' };



  const [siteContext, categories] = await Promise.all([buildSiteContextForAi(), getBlogCategories()]);

  const linkOptions = siteContext.sitemap;

  const defaultPaths = linkOptions.map((l) => l.path);

  const selectedLinkPaths =

    input.selectedLinkPaths?.length && input.selectedLinkPaths.length < defaultPaths.length

      ? input.selectedLinkPaths

      : defaultPaths;

  const selectedLinks = linkOptions.filter((l) => selectedLinkPaths.includes(l.path));

  const categoryName = input.categoryName?.trim() || categories[0]?.name || '';

  const relatedArticles = siteContext.blogArticles.map((a) => ({
    path: `/insights/${a.slug}`,
    title: a.title,
    excerpt: a.excerpt,
  }));



  return {

    ok: true,

    data: {

      systemPrompt: buildAiArticleSystemPrompt(siteContext),

      userPrompt: buildArticleUserPrompt({

        topic,

        description: input.description,

        keyword: input.keyword,

        clinic: siteContext.brand.name,

        selectedLinks,

        relatedArticles,

        categoryName,

      }),

      linkOptions,

      categories,

      selectedLinkPaths,

      categoryName,

    },

  };

}



export async function generateArticleWithAi(input: {

  topic: string;

  description: string;

  keyword?: string;

  includeImages?: boolean;

  systemPrompt?: string;

  userPrompt?: string;

  selectedLinkPaths?: string[];

  categoryName?: string;

}): Promise<{ ok: true; data: AiArticleResult } | { ok: false; error: string }> {

  const topic = input.topic.trim();

  if (!topic) return { ok: false, error: 'عنوان یا موضوع مقاله را وارد کنید.' };



  const [siteContext, categories] = await Promise.all([buildSiteContextForAi(), getBlogCategories()]);

  const selectedLinks = siteContext.sitemap.filter((l) =>

    input.selectedLinkPaths?.length ? input.selectedLinkPaths.includes(l.path) : true,

  );

  const relatedArticles = siteContext.blogArticles.map((a) => ({
    path: `/insights/${a.slug}`,
    title: a.title,
    excerpt: a.excerpt,
  }));



  const systemContent = input.systemPrompt?.trim() || buildAiArticleSystemPrompt(siteContext);

  const userContent =

    input.userPrompt?.trim() ||

    buildArticleUserPrompt({

      topic,

      description: input.description,

      keyword: input.keyword,

      clinic: siteContext.brand.name,

      selectedLinks,

      relatedArticles,

      categoryName: input.categoryName,

    });



  const ai = await aiChatCompletion({

    responseFormat: 'json',

    messages: [

      { role: 'system', content: systemContent },

      { role: 'user', content: userContent },

    ],

  });



  if (!ai.ok) {

    if (ai.reason === 'disabled' || ai.reason === 'missing_key') {

      return { ok: true, data: fallbackArticle(topic, input.description, input.keyword) };

    }

    return { ok: false, error: ai.error };

  }



  try {

    const parsed = JSON.parse(ai.content) as Partial<AiArticleResult> & {

      seo?: { title?: string; description?: string };

      seoKeywords?: string[];

      htmlOutline?: { h2?: string[]; h3?: string[] };

      imageAlts?: { context?: string; alt?: string }[];

      category?: string;

    };

    let body = parsed.body || fallbackArticle(topic, input.description, input.keyword).body;

    let cover_url: string | undefined;

    const inlineAlt =

      parsed.imageAlts?.find((item) => item.alt?.trim())?.alt?.trim() ||

      input.keyword ||

      topic;

    const categoryName = parsed.category || input.categoryName;

    const category_id = resolveCategoryId(categoryName, categories);



    if (input.includeImages) {

      const imagePrompt = `${topic} — ${input.keyword || topic} — آکادمی بهرام، برند شخصی و آموزش`;

      const [coverRes, inlineRes] = await Promise.all([

        generateAiImage({ prompt: imagePrompt, purpose: 'cover', alt: topic }),

        generateAiImage({

          prompt: `تصویر آموزشی درباره ${input.keyword || topic} برای آکادمی بهرام`,

          purpose: 'inline',

          alt: inlineAlt,

        }),

      ]);

      if (coverRes.ok) cover_url = coverRes.url;

      if (inlineRes.ok) body = insertInlineImage(body, inlineRes.url, inlineAlt);

    }



    return {

      ok: true,

      data: {

        title: parsed.title || topic,

        slug: parsed.slug || slugifyFa(topic),

        excerpt: parsed.excerpt || input.description,

        body,

        cover_url,

        reading_time: parsed.reading_time || '۵ دقیقه',

        focusKeyword: parsed.focusKeyword || input.keyword || topic,

        category: categoryName,

        category_id,

        seoKeywords: parsed.seoKeywords?.filter(Boolean),

        htmlOutline: parsed.htmlOutline

          ? { h2: parsed.htmlOutline.h2 ?? [], h3: parsed.htmlOutline.h3 ?? [] }

          : undefined,

        imageAlts: parsed.imageAlts

          ?.filter((item) => item.alt?.trim())

          .map((item) => ({ context: item.context ?? '', alt: item.alt!.trim() })),

        seo: {

          title: parsed.seo?.title || `${topic} | بهرام رستمی`,

          description: parsed.seo?.description || parsed.excerpt || input.description,

        },

      },

    };

  } catch {

    return { ok: true, data: fallbackArticle(topic, input.description, input.keyword) };

  }

}



export async function fixSeoCheckWithAi(input: {
  check: SeoCheck;
  article: SeoFixArticleContext;
  categories?: ApiCategory[];
}): Promise<{ ok: true; data: SeoFixAiResponse } | { ok: false; error: string }> {
  const { check, article, categories } = input;

  if (check.id === 'cover') {
    return {
      ok: false,
      error: 'برای تصویر شاخص از بخش «تصویر شاخص» در ویرایشگر یا دکمه AI تصویر استفاده کنید.',
    };
  }

  const local = localSeoFix(check.id, article, categories?.map((c) => ({ id: c.id, name: c.name })));
  if (local) return { ok: true, data: local };

  if (!seoCheckNeedsAi(check.id)) {
    return { ok: false, error: 'این مورد به‌صورت خودکار قابل اصلاح نیست.' };
  }

  const siteContext = await buildSiteContextForAi();

  const ai = await aiChatCompletion({
    responseFormat: 'json',
    messages: [
      { role: 'system', content: buildSeoFixSystemPrompt(siteContext) },
      {
        role: 'user',
        content: buildSeoFixUserPrompt(
          check,
          article,
          categories?.map((c) => ({ id: c.id, name: c.name })),
          siteContext,
        ),
      },
    ],
    temperature: 0.4,
  });

  if (!ai.ok) {
    return { ok: false, error: ai.error };
  }

  try {
    const parsed = JSON.parse(ai.content) as { summary?: string; patch?: Record<string, unknown> };
    const patch = pickPatchFields(parsed.patch ?? {}, check.id);
    if (patch.categoryName && categories?.length) {
      const match = categories.find((c) => c.name === patch.categoryName);
      if (match) patch.categoryId = match.id;
    }
    if (!Object.keys(patch).length) {
      return { ok: false, error: 'AI پیشنهادی برنگرداند. دوباره تلاش کنید.' };
    }
    return {
      ok: true,
      data: {
        summary: parsed.summary?.trim() || 'پیشنهاد AI آماده است — قبل از اعمال بررسی کنید.',
        patch,
      },
    };
  } catch {
    return { ok: false, error: 'پاسخ AI نامعتبر بود.' };
  }
}

export async function createBlogCategory(input: {
  name: string;
  slug?: string;
}): Promise<{ ok: true; data: ApiCategory } | { ok: false; error: string }> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: 'نام دسته را وارد کنید.' };

  const slug = input.slug?.trim();
  const body: { type: 'blog'; name: string; slug?: string } = { type: 'blog', name };
  if (slug) body.slug = slug;

  try {
    const res = await adminFetch<{ data: ApiCategory }>('/categories', {
      method: 'POST',
      body,
    });
    return { ok: true, data: res.data };
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 422) return { ok: false, error: 'اسلاگ تکراری است یا نامعتبر.' };
    return { ok: false, error: 'افزودن دسته ناموفق بود.' };
  }
}

export async function updateBlogCategory(
  id: number,
  input: { name?: string; slug?: string },
): Promise<{ ok: true; data: ApiCategory } | { ok: false; error: string }> {
  const name = input.name?.trim();
  const slug = input.slug?.trim();
  if (!name && !slug) return { ok: false, error: 'نام یا اسلاگ را وارد کنید.' };

  const body: { name?: string; slug?: string } = {};
  if (name) body.name = name;
  if (slug) body.slug = slug;

  try {
    const res = await adminFetch<{ data: ApiCategory }>(`/categories/${id}`, {
      method: 'PATCH',
      body,
    });
    return { ok: true, data: res.data };
  } catch (e) {
    const err = e as Error & { status?: number };
    if (err.status === 422) return { ok: false, error: 'اسلاگ تکراری است یا نامعتبر.' };
    return { ok: false, error: 'ذخیره تغییرات ناموفق بود.' };
  }
}

export async function deleteBlogCategory(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/categories/${id}`, { method: 'DELETE' });
    return { ok: true };
  } catch {
    return { ok: false, error: 'حذف دسته ناموفق بود.' };
  }
}

