import type { LinkOption } from '@/lib/ai/articlePrompt';
import type { ApiCategory } from '@/lib/api/types';

export type ArticleLinkOption = LinkOption;

export interface AiArticleResult {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  reading_time: string;
  focusKeyword: string;
  category?: string;
  category_id?: number | null;
  cover_url?: string;
  seo: { title: string; description: string };
  seoKeywords?: string[];
  htmlOutline?: { h2: string[]; h3: string[] };
  imageAlts?: { context: string; alt: string }[];
}

export interface ArticlePromptPreview {
  systemPrompt: string;
  userPrompt: string;
  linkOptions: ArticleLinkOption[];
  categories: ApiCategory[];
  selectedLinkPaths: string[];
  categoryName: string;
}
