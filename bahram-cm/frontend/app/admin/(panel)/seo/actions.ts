'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import type { RobotsTxtConfig } from '@/lib/seo/robotsTxt';

export interface SeoData {
  title: string;
  description: string | null;
  canonical: string | null;
  robots: string;
  focus_keyword?: string | null;
}

export async function getRobotsTxtConfig(): Promise<RobotsTxtConfig | null> {
  try {
    const res = await adminFetch<{ data: RobotsTxtConfig }>('/seo/robots');
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function saveRobotsTxt(body: string): Promise<{ ok: true; data: RobotsTxtConfig } | { ok: false; error: string }> {
  try {
    const res = await adminFetch<{ data: RobotsTxtConfig }>('/seo/robots', {
      method: 'PUT',
      body: { body },
    });
    revalidateTag('seo', 'max');
    revalidatePath('/robots.txt');
    return { ok: true, data: res.data };
  } catch (e) {
    const err = e as Error & { payload?: { message?: string } };
    return { ok: false, error: err.payload?.message ?? err.message ?? 'ذخیره robots.txt ناموفق بود.' };
  }
}

export async function getSitemapIndex(): Promise<import('@/lib/seo/sitemapXml').SitemapIndexEntry[]> {
  try {
    const res = await adminFetch<{ data: import('@/lib/seo/sitemapXml').SitemapIndexEntry[] }>('/seo/sitemap/index');
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function getSeo(type: string, id: string): Promise<SeoData | null> {
  try {
    const res = await adminFetch<{ data: SeoData }>(`/seo/${type}/${encodeURIComponent(id)}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function saveSeo(type: string, id: string, data: SeoData): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/seo/${type}/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: {
        title: data.title,
        description: data.description || null,
        canonical: data.canonical || null,
        robots: data.robots || 'index,follow',
        focus_keyword: data.focus_keyword?.trim() || null,
      },
    });
    revalidateTag('seo', 'max');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
