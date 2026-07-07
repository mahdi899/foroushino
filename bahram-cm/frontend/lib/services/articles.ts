/** Admin-managed blog articles service. */
import { normalizeArticleSlugParam } from '@/lib/articleSlug';
import { getJson, type ApiResult } from './api';
import { getStaticJson } from './staticFetch';

export type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  featured_image_alt?: string | null;
  published_at: string | null;
};

export type ArticleDetail = ArticleListItem & {
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  is_indexable: boolean;
  author: string | null;
  kicker?: string | null;
  reading_time?: string | null;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta };
type SingleResponse<T> = { data: T };

const isServer = typeof window === 'undefined';

export async function getArticles(
  page = 1,
  perPage = 50,
): Promise<ApiResult<{ items: ArticleListItem[]; meta: PaginationMeta }>> {
  const path = `/articles?page=${page}&per_page=${perPage}`;

  if (isServer) {
    const result = await getStaticJson<PaginatedResponse<ArticleListItem>>(path, {
      ttlKey: 'articles',
      tags: ['articles'],
    });
    if (!result.ok) return result;
    return { ok: true, data: { items: result.data.data, meta: result.data.meta } };
  }

  const result = await getJson<PaginatedResponse<ArticleListItem>>(path);
  if (!result.ok) return result;
  return { ok: true, data: { items: result.data.data, meta: result.data.meta } };
}

export async function getArticleBySlug(
  slug: string,
): Promise<ApiResult<ArticleDetail>> {
  const normalized = normalizeArticleSlugParam(slug);
  const path = `/articles/${encodeURIComponent(normalized)}`;

  if (isServer) {
    const result = await getStaticJson<SingleResponse<ArticleDetail>>(path, {
      ttlKey: 'articles',
      tags: ['articles', `article:${normalized}`],
    });
    if (!result.ok) return result;
    return { ok: true, data: result.data.data };
  }

  const result = await getJson<SingleResponse<ArticleDetail>>(path);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
