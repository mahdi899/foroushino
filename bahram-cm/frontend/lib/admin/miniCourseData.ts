import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type { AdminMiniCourse, AdminMiniCourseComment } from './miniCourseTypes';

function errorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) {
    return 'نشست شما منقضی شده. از پنل خارج شوید و دوباره وارد شوید.';
  }
  return 'اتصال به API برقرار نشد. مطمئن شوید سرور لاراول روی پورت ۸۰۱۰ در حال اجراست.';
}

export async function getMiniCourses(): Promise<{ items: AdminMiniCourse[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminMiniCourse[] }>('/mini-courses', { query: { per_page: 200 } });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: errorMessage(e) };
  }
}

export async function getMiniCourse(id: number): Promise<AdminMiniCourse | null> {
  try {
    const res = await adminFetch<{ data: AdminMiniCourse }>(`/mini-courses/${id}`);
    return res.data;
  } catch {
    return null;
  }
}

export async function getMiniCourseComments(
  courseId: number,
  status?: string,
): Promise<{ items: AdminMiniCourseComment[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminMiniCourseComment[] }>(
      `/mini-courses/${courseId}/comments`,
      { query: { per_page: 200, status } },
    );
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: errorMessage(e) };
  }
}
