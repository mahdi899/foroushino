import 'server-only';
import { apiFetch } from './client';
import { getRevalidateSeconds } from '@/lib/cache/revalidate';
import type { ApiCategory } from './types';

export async function getBlogCategories(): Promise<ApiCategory[]> {
  try {
    const revalidate = await getRevalidateSeconds('articles');
    const res = await apiFetch<{ data: ApiCategory[] }>('/categories?filter[type]=blog', {
      revalidate,
      tags: ['categories', 'articles'],
    });
    return res.data ?? [];
  } catch {
    return [];
  }
}
