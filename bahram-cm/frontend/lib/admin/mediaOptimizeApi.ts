import 'server-only';

import { SERVER_API_URL } from '@/lib/api/config';
import { getToken } from '@/lib/auth/session';
import { persistMediaUrl, resolveMediaUrl } from '@/lib/mediaUrl';
import type { AdminMediaItem } from '@/lib/admin/mediaTypes';
import type { MediaOptimizePreview } from '@/lib/admin/mediaOptimize';

export async function previewMediaOptimizeApi(formData: FormData): Promise<MediaOptimizePreview> {
  const token = await getToken();
  const res = await fetch(`${SERVER_API_URL}/media/optimize-preview`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'بهینه‌سازی تصویر ناموفق بود.');
  }

  const json = (await res.json()) as { data: MediaOptimizePreview };
  return json.data;
}

export async function confirmMediaReplaceApi(payload: {
  mediaId: number;
  session_id: string;
  variant: 'original' | 'optimized';
  alt_fa: string;
}): Promise<AdminMediaItem> {
  const token = await getToken();
  const res = await fetch(`${SERVER_API_URL}/media/${payload.mediaId}/optimize-replace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      session_id: payload.session_id,
      variant: payload.variant,
      alt_fa: payload.alt_fa,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('جایگزینی تصویر ناموفق بود.');
  }

  const json = (await res.json()) as {
    data: { id: number; url: string; alt_fa?: string | null; category?: string | null; mime?: string | null };
  };

  const displayUrl = resolveMediaUrl(json.data.url);
  return {
    id: json.data.id,
    url: displayUrl,
    persistSrc: persistMediaUrl(json.data.url),
    label: json.data.alt_fa?.trim() || 'آپلود شده',
    category: json.data.category?.trim() || 'آپلود شده',
    mime: json.data.mime,
  };
}

export async function previewExistingMediaOptimizeApi(mediaId: number): Promise<MediaOptimizePreview> {
  const token = await getToken();
  const res = await fetch(`${SERVER_API_URL}/media/${mediaId}/optimize-preview`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(err?.message || 'بهینه‌سازی تصویر ناموفق بود.');
  }

  const json = (await res.json()) as { data: MediaOptimizePreview };
  return json.data;
}

export async function confirmMediaOptimizeApi(payload: {
  session_id: string;
  variant: 'original' | 'optimized';
  alt_fa: string;
  category?: string;
}): Promise<AdminMediaItem> {
  const token = await getToken();
  const res = await fetch(`${SERVER_API_URL}/media/optimize-confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error('ذخیره تصویر ناموفق بود.');
  }

  const json = (await res.json()) as {
    data: { id: number; url: string; alt_fa?: string | null; category?: string | null; mime?: string | null };
  };

  const displayUrl = resolveMediaUrl(json.data.url);
  return {
    id: json.data.id,
    url: displayUrl,
    persistSrc: persistMediaUrl(json.data.url),
    label: json.data.alt_fa?.trim() || 'آپلود شده',
    category: json.data.category?.trim() || 'آپلود شده',
    mime: json.data.mime,
  };
}

export async function discardMediaOptimizeApi(sessionId: string): Promise<void> {
  const token = await getToken();
  await fetch(`${SERVER_API_URL}/media/optimize-preview/${sessionId}`, {
    method: 'DELETE',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    cache: 'no-store',
  }).catch(() => undefined);
}
