'use server';

import { revalidatePath } from 'next/cache';
import { adminFetch } from '@/lib/auth/session';
import { revalidateMiniCourseSurfaces } from '@/lib/cache/contentRevalidation';

function actionError(e: unknown, fallback: string): { ok: false; error: string } {
  const err = e as Error & {
    payload?: {
      error?: { message_fa?: string; details?: Record<string, string[]> };
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  const payload = err.payload;
  const details = payload?.error?.details ?? payload?.errors;
  if (details && typeof details === 'object') {
    const first = Object.values(details).flat().find((msg) => typeof msg === 'string' && msg.trim());
    if (first) return { ok: false, error: first };
  }
  return {
    ok: false,
    error: payload?.error?.message_fa ?? payload?.message ?? fallback,
  };
}

function revalidateAdmin() {
  revalidatePath('/admin/academy/mini-courses', 'layout');
}

export async function saveMiniCourse(
  input: {
    slug: string;
    title: string;
    subtitle?: string | null;
    summary?: string | null;
    description?: string | null;
    thumbnail?: string | null;
    aparat_hash: string;
    level?: string | null;
    duration?: string | null;
    sort_order?: number;
    is_active?: boolean;
    comments_enabled?: boolean;
    meta_title?: string | null;
    meta_description?: string | null;
  },
  id?: number,
): Promise<{ ok: boolean; id?: number; error?: string }> {
  try {
    if (id) {
      await adminFetch(`/mini-courses/${id}`, { method: 'PATCH', body: input });
      revalidateAdmin();
      await revalidateMiniCourseSurfaces(input.slug);
      return { ok: true, id };
    }
    const res = await adminFetch<{ data: { id: number } }>('/mini-courses', { method: 'POST', body: input });
    revalidateAdmin();
    await revalidateMiniCourseSurfaces(input.slug);
    return { ok: true, id: res.data?.id };
  } catch (e) {
    return actionError(e, 'ذخیره مینی‌دوره ناموفق بود.');
  }
}

export async function deleteMiniCourse(id: number): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/mini-courses/${id}`, { method: 'DELETE' });
    revalidateAdmin();
    await revalidateMiniCourseSurfaces();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف مینی‌دوره ناموفق بود.');
  }
}

export async function updateMiniCourseComment(
  courseId: number,
  commentId: number,
  input: { status?: 'pending' | 'approved' | 'rejected'; body?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/mini-courses/${courseId}/comments/${commentId}`, { method: 'PATCH', body: input });
    revalidateAdmin();
    await revalidateMiniCourseSurfaces();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'به‌روزرسانی نظر ناموفق بود.');
  }
}

export async function deleteMiniCourseComment(
  courseId: number,
  commentId: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await adminFetch(`/mini-courses/${courseId}/comments/${commentId}`, { method: 'DELETE' });
    revalidateAdmin();
    await revalidateMiniCourseSurfaces();
    return { ok: true };
  } catch (e) {
    return actionError(e, 'حذف نظر ناموفق بود.');
  }
}
