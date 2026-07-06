'use server';

import { revalidatePath } from 'next/cache';
import { suggestMediaAltWithAi, filenameToFallbackAlt } from '@/lib/ai/mediaAlt';
import type { MediaOptimizePreview } from '@/lib/admin/mediaOptimize';
import { SITE_ORIGIN } from '@/lib/api/config';
import {
  confirmMediaOptimizeApi,
  confirmMediaReplaceApi,
  discardMediaOptimizeApi,
  previewExistingMediaOptimizeApi,
  previewMediaOptimizeApi,
} from '@/lib/admin/mediaOptimizeApi';
import {
  deleteAdminMedia,
  getAdminMediaItems,
  getAdminMediaPage,
  getMediaTrashCount,
  getMediaTrashItems,
  restoreAdminMedia,
  updateAdminMedia,
  uploadAdminMediaWithAutoAlt,
} from '../content/actions';
import type { AdminMediaItem, AdminMediaPageResult, AdminMediaTrashItem } from '@/lib/admin/mediaTypes';

export async function listGalleryMedia(): Promise<AdminMediaItem[]> {
  return getAdminMediaItems();
}

export async function listGalleryMediaPage(options: {
  page?: number;
  search?: string;
  category?: string;
  perPage?: number;
}): Promise<AdminMediaPageResult> {
  return getAdminMediaPage({ ...options, perPage: options.perPage ?? 25 });
}

function rewritePreviewUrls(preview: MediaOptimizePreview): MediaOptimizePreview {
  const origin = SITE_ORIGIN.replace(/\/+$/, '');
  const fix = (url: string) => {
    try {
      const parsed = new URL(url);
      return `${origin}${parsed.pathname}${parsed.search}`;
    } catch {
      return url.startsWith('/') ? `${origin}${url}` : url;
    }
  };
  return {
    ...preview,
    original: { ...preview.original, preview_url: fix(preview.original.preview_url) },
    optimized: { ...preview.optimized, preview_url: fix(preview.optimized.preview_url) },
  };
}

export async function previewGalleryOptimize(
  formData: FormData,
): Promise<{ ok: true; preview: MediaOptimizePreview } | { ok: false; error: string }> {
  try {
    const preview = rewritePreviewUrls(await previewMediaOptimizeApi(formData));
    return { ok: true, preview };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'بهینه‌سازی ناموفق بود.' };
  }
}

export async function previewGalleryMediaOptimizeExisting(
  mediaId: number,
): Promise<{ ok: true; preview: MediaOptimizePreview } | { ok: false; error: string }> {
  try {
    const preview = rewritePreviewUrls(await previewExistingMediaOptimizeApi(mediaId));
    return { ok: true, preview };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'بهینه‌سازی ناموفق بود.' };
  }
}

export async function confirmGalleryMediaReplace(payload: {
  media_id: number;
  session_id: string;
  variant: 'original' | 'optimized';
  alt_fa: string;
}): Promise<{ ok: true; item: AdminMediaItem } | { ok: false; error: string }> {
  try {
    const item = await confirmMediaReplaceApi({
      mediaId: payload.media_id,
      session_id: payload.session_id,
      variant: payload.variant,
      alt_fa: payload.alt_fa,
    });
    revalidatePath('/admin/gallery');
    return { ok: true, item };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'جایگزینی تصویر ناموفق بود.' };
  }
}

export async function confirmGalleryUpload(payload: {
  session_id: string;
  variant: 'original' | 'optimized';
  alt_fa: string;
  category?: string;
}): Promise<{ ok: true; item: AdminMediaItem } | { ok: false; error: string }> {
  try {
    const item = await confirmMediaOptimizeApi(payload);
    revalidatePath('/admin/gallery');
    return { ok: true, item };
  } catch {
    return { ok: false, error: 'ذخیره تصویر ناموفق بود.' };
  }
}

export async function discardGalleryOptimize(sessionId: string): Promise<void> {
  await discardMediaOptimizeApi(sessionId);
}

export async function saveMediaAlt(
  id: number,
  alt_fa: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const alt = alt_fa.trim();
  if (!alt) return { ok: false, error: 'نام / alt تصویر را وارد کنید.' };
  const ok = await updateAdminMedia(id, { alt_fa: alt });
  return ok ? { ok: true } : { ok: false, error: 'ذخیره ناموفق بود.' };
}

export async function removeGalleryMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  return deleteAdminMedia(id);
}

export async function restoreGalleryMedia(id: number): Promise<{ ok: true } | { ok: false; error: string }> {
  return restoreAdminMedia(id);
}

export async function getGalleryTrashCount(): Promise<number> {
  return getMediaTrashCount();
}

export async function listGalleryTrash(): Promise<AdminMediaTrashItem[]> {
  return getMediaTrashItems();
}

export async function uploadGalleryImage(
  formData: FormData,
): Promise<{ ok: true; item: AdminMediaItem } | { ok: false; error: string }> {
  const res = await uploadAdminMediaWithAutoAlt(formData);
  if (res.ok) revalidatePath('/admin/gallery');
  return res;
}

export async function rewriteOptimizeAltWithAi(
  filename: string,
  mime?: string,
  title?: string,
): Promise<{ ok: true; alt: string; aiUsed: boolean } | { ok: false; error: string }> {
  const suggested = await suggestMediaAltWithAi(filename, mime);
  const alt = suggested.ok ? suggested.alt : filenameToFallbackAlt(filename, title ?? filename);
  return { ok: true, alt, aiUsed: suggested.ok };
}

export async function rewriteMediaAltWithAi(
  id: number,
  filename: string,
  mime?: string,
  title?: string,
): Promise<{ ok: true; alt: string; aiUsed: boolean } | { ok: false; error: string }> {
  const suggested = await suggestMediaAltWithAi(filename, mime);
  const alt = suggested.ok ? suggested.alt : filenameToFallbackAlt(filename, title ?? filename);

  const saved = await saveMediaAlt(id, alt);
  if (!saved.ok) return { ok: false, error: saved.error };

  revalidatePath('/admin/gallery');
  return { ok: true, alt, aiUsed: suggested.ok };
}
