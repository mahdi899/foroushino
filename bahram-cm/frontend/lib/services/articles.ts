/** Admin-managed blog articles service. */
import { getJson, type ApiResult } from "./api";

export type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  featured_image: string | null;
  published_at: string | null;
};

export type ArticleDetail = ArticleListItem & {
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  canonical_url: string | null;
  is_indexable: boolean;
  author: string | null;
};

export type PaginationMeta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
};

type PaginatedResponse<T> = { data: T[]; meta: PaginationMeta };
type SingleResponse<T> = { data: T };

export async function getArticles(
  page = 1,
): Promise<ApiResult<{ items: ArticleListItem[]; meta: PaginationMeta }>> {
  const result = await getJson<PaginatedResponse<ArticleListItem>>(
    `/articles?page=${page}`,
  );
  if (!result.ok) return result;
  return { ok: true, data: { items: result.data.data, meta: result.data.meta } };
}

export async function getArticleBySlug(
  slug: string,
): Promise<ApiResult<ArticleDetail>> {
  const result = await getJson<SingleResponse<ArticleDetail>>(
    `/articles/${encodeURIComponent(slug)}`,
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
