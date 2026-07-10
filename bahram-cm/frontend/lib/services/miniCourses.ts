/** Public mini courses from Laravel API. */
import { getJson, postJson, type ApiResult } from './api';
import { getStaticJson } from './staticFetch';

export type MiniCourseApiRecord = {
  slug: string;
  title: string;
  subtitle?: string | null;
  summary?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  aparat_hash: string;
  level?: string | null;
  duration?: string | null;
  comments_enabled: boolean;
  meta_title?: string | null;
  meta_description?: string | null;
};

export type MiniCourseCommentRecord = {
  id: number;
  author_name: string;
  body: string;
  created_at: string | null;
  replies?: MiniCourseCommentRecord[];
};

type MiniCoursesResponse = { data: MiniCourseApiRecord[] };
type MiniCourseResponse = { data: MiniCourseApiRecord };
type MiniCourseCommentsResponse = { data: MiniCourseCommentRecord[] };
type CommentSubmitResponse = {
  data: { id: number; status: string; message: string };
};

const isServer = typeof window === 'undefined';

export async function getMiniCoursesFromApi(): Promise<ApiResult<MiniCourseApiRecord[]>> {
  const path = '/mini-courses';

  if (isServer) {
    const result = await getStaticJson<MiniCoursesResponse>(path, {
      ttlKey: 'cases',
      tags: ['mini-courses', 'public-mini-courses'],
    });
    if (!result.ok) return result;
    return { ok: true, data: result.data.data ?? [] };
  }

  const result = await getJson<MiniCoursesResponse>(path);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}

export async function getMiniCourseBySlugFromApi(
  slug: string,
): Promise<ApiResult<MiniCourseApiRecord | null>> {
  const path = `/mini-courses/${encodeURIComponent(slug)}`;

  if (isServer) {
    const result = await getStaticJson<MiniCourseResponse>(path, {
      ttlKey: 'cases',
      tags: ['mini-courses', 'public-mini-courses', `mini-course:${slug}`],
    });
    if (!result.ok) {
      if (result.status === 404) return { ok: true, data: null };
      return result;
    }
    return { ok: true, data: result.data.data ?? null };
  }

  const result = await getJson<MiniCourseResponse>(path);
  if (!result.ok) {
    if (result.status === 404) return { ok: true, data: null };
    return result;
  }
  return { ok: true, data: result.data.data ?? null };
}

export async function getMiniCourseCommentsFromApi(
  slug: string,
): Promise<ApiResult<MiniCourseCommentRecord[]>> {
  const path = `/mini-courses/${encodeURIComponent(slug)}/comments`;

  if (isServer) {
    const result = await getStaticJson<MiniCourseCommentsResponse>(path, {
      ttlKey: 'cases',
      tags: ['mini-courses', 'public-mini-courses', `mini-course:${slug}`],
    });
    if (!result.ok) return result;
    return { ok: true, data: result.data.data ?? [] };
  }

  const result = await getJson<MiniCourseCommentsResponse>(path);
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}

export async function submitMiniCourseComment(
  slug: string,
  input: {
    author_name: string;
    author_email?: string;
    body: string;
    captcha_token?: string;
    captcha_id?: string;
    captcha_answer?: string;
    website?: string;
  },
): Promise<ApiResult<{ id: number; status: string; message: string }>> {
  const result = await postJson<CommentSubmitResponse>(
    `/mini-courses/${encodeURIComponent(slug)}/comments`,
    input,
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}
