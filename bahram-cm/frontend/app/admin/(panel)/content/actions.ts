'use server';

import { revalidatePath, revalidateTag } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { mediaAltNeedsFix, suggestMediaAltWithAi, filenameToFallbackAlt } from '@/lib/ai/mediaAlt';
import { persistMediaUrl, resolveMediaUrl, normalizeAdminMediaUrl } from '@/lib/mediaUrl';
import { notifySearchCrawlers, type CrawlerNotifyResult } from '@/lib/seo/notifyCrawlers';
import type { ArticlePayload } from '@/lib/admin/articleTypes';
import type { AdminMediaItem, AdminMediaPageResult, AdminMediaTrashItem } from '@/lib/admin/mediaTypes';
import type { ApiArticle, ApiCase, ApiDoctor } from '@/lib/api/types';

export async function getAdminArticles(): Promise<ApiArticle[]> {
  try {
    const res = await adminFetch<{ data: ApiArticle[] }>('/manage/articles');
    return res.data;
  } catch {
    return [];
  }
}

export async function getAdminArticle(slug: string): Promise<ApiArticle | null> {
  try {
    const res = await adminFetch<{ data: ApiArticle }>(`/articles/${slug}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getAdminArticleById(id: number): Promise<ApiArticle | null> {
  try {
    const res = await adminFetch<{ data: ApiArticle }>(`/manage/articles/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function saveArticle(
  id: number | null,
  payload: ArticlePayload,
): Promise<{ ok: boolean; id?: number; crawlNotify?: CrawlerNotifyResult }> {
  try {
    let articleId = id ?? undefined;
    let savedSlug = payload.slug;
    if (id) {
      await adminFetch(`/articles/${id}`, { method: 'PATCH', body: payload });
    } else {
      const res = await adminFetch<{ data: ApiArticle }>('/articles', { method: 'POST', body: payload });
      articleId = res.data.id;
      savedSlug = savedSlug ?? res.data.slug;
    }

    revalidateTag('seo', 'max');
    revalidatePath('/admin/blog');
    revalidatePath('/admin/blog/new');
    revalidatePath('/insights');
    revalidatePath('/articles');
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemaps');
    if (savedSlug) {
      revalidatePath(`/insights/${savedSlug}`);
      revalidatePath(`/articles/${savedSlug}`);
    }

    let crawlNotify: CrawlerNotifyResult | undefined;
    if (payload.status === 'active' && savedSlug) {
      crawlNotify = await notifySearchCrawlers(`/insights/${savedSlug}`);
    }

    return { ok: true, id: articleId, crawlNotify };
  } catch {
    return { ok: false };
  }
}

export async function deleteArticle(
  id: number,
): Promise<{ ok: boolean; purgeAt?: string; message?: string; error?: string }> {
  try {
    const res = await adminFetch<{ data: { purge_at: string }; message: string }>(`/articles/${id}`, {
      method: 'DELETE',
    });
    revalidatePath('/admin/blog');
    revalidatePath('/insights');
    revalidatePath('/articles');
    revalidatePath('/sitemap.xml');
    revalidatePath('/sitemaps');
    revalidateTag('seo', 'max');
    return { ok: true, purgeAt: res.data?.purge_at, message: res.message };
  } catch {
    return { ok: false, error: 'حذف مقاله ناموفق بود.' };
  }
}

export async function getTrashedArticles(): Promise<ApiArticle[]> {
  try {
    const res = await adminFetch<{ data: ApiArticle[] }>('/manage/articles/trash');
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

export async function getAdminCases(): Promise<ApiCase[]> {
  try {
    const res = await adminFetch<{ data: ApiCase[] }>('/manage/cases');
    return res.data;
  } catch {
    return [];
  }
}

export async function updateCase(
  id: number,
  payload: Partial<{
    title: string;
    summary: string;
    before_url: string;
    after_url: string;
    treatment_duration: string;
    service_id: number | null;
  }>,
): Promise<boolean> {
  try {
    await adminFetch(`/cases/${id}`, { method: 'PATCH', body: payload });
    revalidatePath('/admin/cases');
    return true;
  } catch {
    return false;
  }
}

export async function createCase(payload: {
  title: string;
  summary?: string;
  before_url?: string;
  after_url?: string;
  service_id?: number | null;
}): Promise<ApiCase | null> {
  try {
    const res = await adminFetch<{ data: ApiCase }>('/cases', { method: 'POST', body: payload });
    revalidatePath('/admin/cases');
    revalidatePath('/cases');
    return res.data;
  } catch {
    return null;
  }
}

export async function getAdminDoctors(): Promise<ApiDoctor[]> {
  try {
    const res = await adminFetch<{ data: ApiDoctor[] }>('/manage/doctors');
    return res.data;
  } catch {
    return [];
  }
}

export async function updateDoctor(
  id: number,
  payload: Partial<{ name_fa: string; title: string; bio: string; image_url: string }>,
): Promise<boolean> {
  try {
    await adminFetch(`/doctors/${id}`, { method: 'PATCH', body: payload });
    revalidatePath('/admin/doctors');
    return true;
  } catch {
    return false;
  }
}

function mapAdminMediaRow(m: {
  id: number;
  url?: string | null;
  view_url?: string | null;
  legacy_path?: string | null;
  alt_fa?: string | null;
  category?: string | null;
  mime?: string | null;
}): AdminMediaItem {
  const ref = m.url || m.legacy_path || '';
  const persistSrc = persistMediaUrl(ref);
  const displayUrl = normalizeAdminMediaUrl(m.view_url || resolveMediaUrl(persistSrc));
  return {
    id: m.id,
    url: displayUrl,
    persistSrc,
    legacyPath: m.legacy_path ?? null,
    label: m.alt_fa?.trim() || 'آپلود شده',
    category: m.category?.trim() || 'آپلود شده',
    mime: m.mime,
  };
}

export async function getAdminMediaPage(options: {
  page?: number;
  perPage?: number;
  search?: string;
  category?: string;
}): Promise<AdminMediaPageResult> {
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 100;
  const search = options.search?.trim() ?? '';
  const category = options.category?.trim() ?? '';

  const query: Record<string, string | number | undefined> = {
    page,
    per_page: perPage,
  };
  if (search) query.search = search;
  if (category && category !== 'همه') query['filter[category]'] = category;

  try {
    const res = await adminFetch<{
      data: {
        id: number;
        url: string;
        view_url?: string | null;
        legacy_path?: string | null;
        alt_fa?: string | null;
        category?: string | null;
        mime?: string | null;
      }[];
      meta?: { current_page?: number; last_page?: number; total?: number; per_page?: number };
    }>('/media', { query });

    const items = res.data.map(mapAdminMediaRow);
    return {
      items,
      page: res.meta?.current_page ?? page,
      lastPage: Math.max(1, res.meta?.last_page ?? 1),
      total: res.meta?.total ?? items.length,
      perPage: res.meta?.per_page ?? perPage,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'بارگذاری کتابخانه رسانه ناموفق بود.';
    return { items: [], page: 1, lastPage: 1, total: 0, perPage, error: message };
  }
}

export async function getAdminMediaItems(): Promise<AdminMediaItem[]> {
  try {
    const res = await adminFetch<{
      data: {
        id: number;
        url: string;
        view_url?: string | null;
        legacy_path?: string | null;
        alt_fa?: string | null;
        category?: string | null;
        mime?: string | null;
      }[];
    }>('/media', { query: { per_page: 200 } });
    return res.data.map(mapAdminMediaRow);
  } catch {
    return [];
  }
}

export async function getAdminMedia(): Promise<{ id: number; url: string; label: string }[]> {
  const rows = await getAdminMediaItems();
  return rows.map(({ id, url, label }) => ({ id, url, label }));
}

export async function updateAdminMedia(
  id: number,
  payload: { alt_fa: string; category?: string },
): Promise<boolean> {
  try {
    await adminFetch(`/media/${id}`, { method: 'PATCH', body: payload });
    revalidatePath('/admin/gallery');
    return true;
  } catch {
    return false;
  }
}

export async function deleteAdminMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/media/${id}`, { method: 'DELETE' });
    revalidatePath('/admin/gallery');
    return { ok: true };
  } catch {
    return { ok: false, error: 'انتقال به سطل زباله ناموفق بود.' };
  }
}

export async function restoreAdminMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await adminFetch(`/media/${id}/restore`, { method: 'POST' });
    revalidatePath('/admin/gallery');
    return { ok: true };
  } catch {
    return { ok: false, error: 'بازیابی ناموفق بود.' };
  }
}

export async function getMediaTrashCount(): Promise<number> {
  try {
    const res = await adminFetch<{ data: { count: number } }>('/media/trash/count');
    return res.data.count;
  } catch {
    return 0;
  }
}

export async function getMediaTrashItems(): Promise<AdminMediaTrashItem[]> {
  try {
    const res = await adminFetch<{
      data: {
        id: number;
        url: string;
        alt_fa?: string | null;
        category?: string | null;
        mime?: string | null;
        deleted_at?: string | null;
        purge_at?: string | null;
      }[];
    }>('/media/trash', { query: { per_page: 100 } });
    return res.data.map((m) => ({
      ...mapAdminMediaRow(m),
      deleted_at: m.deleted_at ?? '',
      purge_at: m.purge_at ?? '',
    }));
  } catch {
    return [];
  }
}

export async function uploadAdminMediaBuffer(
  bytes: Buffer,
  filename: string,
  mime: string,
  alt: string,
): Promise<string | null> {
  const { getToken } = await import('@/lib/auth/session');
  const token = await getToken();
  const { SERVER_API_URL } = await import('@/lib/api/config');

  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type: mime }), filename);
  form.append('alt_fa', alt);

  const res = await fetch(`${SERVER_API_URL}/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { data: { url: string } };
  revalidatePath('/admin/gallery');
  return persistMediaUrl(json.data.url) || resolveMediaUrl(json.data.url);
}

export async function uploadAdminMediaRaw(
  formData: FormData,
): Promise<AdminMediaItem | null> {
  const { getToken } = await import('@/lib/auth/session');
  const token = await getToken();
  const { SERVER_API_URL } = await import('@/lib/api/config');

  const res = await fetch(`${SERVER_API_URL}/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    data: { id: number; url: string; alt_fa?: string | null; category?: string | null };
  };
  revalidatePath('/admin/gallery');
  const displayUrl = resolveMediaUrl(json.data.url);
  return {
    id: json.data.id,
    url: displayUrl,
    persistSrc: persistMediaUrl(json.data.url),
    label: json.data.alt_fa?.trim() || 'آپلود شده',
    category: json.data.category?.trim() || 'آپلود شده',
  };
}

export async function uploadAdminMediaWithAutoAlt(
  formData: FormData,
): Promise<{ ok: true; item: AdminMediaItem } | { ok: false; error: string }> {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'فایل تصویر یافت نشد.' };
  }

  const fallbackAlt = String(formData.get('alt_fa') ?? '').trim();
  let alt = fallbackAlt || file.name;

  if (mediaAltNeedsFix(alt, file.name)) {
    const suggested = await suggestMediaAltWithAi(file.name, file.type);
    alt = suggested.ok ? suggested.alt : filenameToFallbackAlt(file.name, fallbackAlt || alt);
  }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('alt_fa', alt);

  const item = await uploadAdminMediaRaw(fd);
  if (!item) {
    return { ok: false, error: 'آپلود ناموفق بود.' };
  }

  return { ok: true, item: { ...item, persistSrc: item.persistSrc, mime: file.type } };
}

export async function uploadAdminMedia(formData: FormData): Promise<{ url: string } | null> {
  const { getToken } = await import('@/lib/auth/session');
  const token = await getToken();
  const { SERVER_API_URL } = await import('@/lib/api/config');

  const res = await fetch(`${SERVER_API_URL}/media`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    cache: 'no-store',
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { data: { url: string } };
  return { url: persistMediaUrl(json.data.url) || resolveMediaUrl(json.data.url) };
}
