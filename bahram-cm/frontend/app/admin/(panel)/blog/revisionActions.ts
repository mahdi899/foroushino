'use server';

import { adminFetch } from '@/lib/auth/session';
import type { ApiArticleRevision, ArticleRevisionSnapshot } from '@/lib/admin/articleRevisions';

function revisionErrorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'payload' in err) {
    const payload = (err as { payload?: { message?: string } }).payload;
    if (payload?.message) return payload.message;
  }
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: number }).status;
    if (status === 401 || status === 403) return 'دسترسی به ثبت نسخه ندارید.';
    if (status === 404) return 'مقاله یا نسخه پیدا نشد.';
    if (status === 422) return 'نسخه‌بندی فقط برای پیش‌نویس فعال است.';
  }
  return 'ثبت نسخه ناموفق بود.';
}

export async function listArticleRevisions(articleId: number): Promise<ApiArticleRevision[]> {
  try {
    const res = await adminFetch<{ data: ApiArticleRevision[] }>(`/articles/${articleId}/revisions`);
    return res.data ?? [];
  } catch {
    return [];
  }
}

export async function createArticleRevision(
  articleId: number,
  snapshot: ArticleRevisionSnapshot,
  label?: string,
  options?: { force?: boolean },
): Promise<{ ok: boolean; revision?: ApiArticleRevision; skipped?: boolean; message?: string }> {
  try {
    const res = await adminFetch<{ data: ApiArticleRevision | null; message?: string }>(
      `/articles/${articleId}/revisions`,
      {
        method: 'POST',
        body: { snapshot, label, force: options?.force ?? false },
      },
    );
    if (!res.data) {
      return { ok: true, skipped: true, message: res.message };
    }
    return { ok: true, revision: res.data };
  } catch (err) {
    return { ok: false, message: revisionErrorMessage(err) };
  }
}

export async function getArticleRevision(
  articleId: number,
  revisionId: number,
): Promise<ApiArticleRevision | null> {
  try {
    const res = await adminFetch<{ data: ApiArticleRevision }>(
      `/articles/${articleId}/revisions/${revisionId}`,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

export async function deleteArticleRevision(articleId: number, revisionId: number): Promise<boolean> {
  try {
    await adminFetch(`/articles/${articleId}/revisions/${revisionId}`, { method: 'DELETE' });
    return true;
  } catch {
    return false;
  }
}
