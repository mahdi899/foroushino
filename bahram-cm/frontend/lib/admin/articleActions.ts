'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import type { ApiArticle } from '@/lib/api/types';

export async function getAdminArticles(): Promise<ApiArticle[]> {
  try {
    const res = await adminFetch<{ data: ApiArticle[] }>('/panel/articles');
    return res.data;
  } catch {
    return [];
  }
}

export async function getTrashedArticles(): Promise<ApiArticle[]> {
  try {
    const res = await adminFetch<{ data: ApiArticle[] }>('/panel/articles/trash');
    return res.data;
  } catch {
    return [];
  }
}

export async function restoreArticle(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/articles/${id}/restore`, { method: 'POST' });
    revalidatePath('/admin/blog');
    revalidatePath('/insights');
    revalidatePath('/articles');
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemaps');
    revalidateTag('seo', 'max');
    return { ok: true };
  } catch {
    return { ok: false, error: 'بازیابی مقاله ناموفق بود.' };
  }
}
