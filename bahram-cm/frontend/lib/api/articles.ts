import 'server-only';
import { apiFetch } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiArticle, Paginated } from './types';

export async function getArticles(params: Record<string, string | number> = {}): Promise<Paginated<ApiArticle>> {
  const qs = new URLSearchParams(params as Record<string, string>).toString();
  const revalidate = await getRevalidateSeconds('articles');
  return apiFetch<Paginated<ApiArticle>>(`/articles${qs ? `?${qs}` : ''}`, {
    revalidate,
    tags: ['articles'],
  });
}

export async function getArticle(slug: string): Promise<ApiArticle> {
  const revalidate = await getRevalidateSeconds('articles');
  const res = await apiFetch<{ data: ApiArticle }>(`/articles/${slug}?with_body=1`, {
    revalidate,
    tags: ['articles', `article:${slug}`],
  });
  return res.data;
}
