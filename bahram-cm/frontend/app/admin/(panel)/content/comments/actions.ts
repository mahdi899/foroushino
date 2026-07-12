'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { revalidateContentCommentSurfaces } from '@/lib/cache/contentRevalidation';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & { payload?: { error?: { message_fa?: string } } };
  return { ok: false, error: err.payload?.error?.message_fa ?? fallback };
}

export async function updateContentComment(
  id: number,
  input: { status?: 'pending' | 'approved' | 'rejected'; body?: string },
  meta?: { content_type?: string; content_slug?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/content-comments/${id}`, { method: 'PATCH', body: input });
    revalidatePath('/admin/content/comments');
    if (meta?.content_type && meta.content_slug) {
      await revalidateContentCommentSurfaces(meta.content_type, meta.content_slug);
    }
    return { ok: true };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی نظر ناموفق بود.');
  }
}

export async function deleteContentComment(
  id: number,
  meta?: { content_type?: string; content_slug?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/content-comments/${id}`, { method: 'DELETE' });
    revalidatePath('/admin/content/comments');
    if (meta?.content_type && meta.content_slug) {
      await revalidateContentCommentSurfaces(meta.content_type, meta.content_slug);
    }
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف نظر ناموفق بود.');
  }
}
