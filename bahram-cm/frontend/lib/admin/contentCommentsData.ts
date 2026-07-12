import 'server-only';
import { adminFetch } from '@/lib/auth/session';
import type { AdminContentComment } from './contentCommentTypes';

function errorMessage(error: unknown): string {
  const err = error as Error & { status?: number };
  if (err.status === 401) {
    return 'نشست شما منقضی شده. از پنل خارج شوید و دوباره وارد شوید.';
  }
  return 'اتصال به API برقرار نشد.';
}

export async function getAdminContentComments(options?: {
  status?: string;
  content_type?: string;
  q?: string;
}): Promise<{ items: AdminContentComment[]; error: string | null }> {
  try {
    const res = await adminFetch<{ data: AdminContentComment[] }>('/content-comments', {
      query: { per_page: 200, ...options },
    });
    return { items: res.data, error: null };
  } catch (e) {
    return { items: [], error: errorMessage(e) };
  }
}
