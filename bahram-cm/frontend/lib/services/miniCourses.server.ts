import 'server-only';

import type { ApiResult } from './api';
import { getStaticJson } from './staticFetch';
import type { MiniCourseApiRecord, MiniCourseCommentRecord } from './miniCourses.types';

type MiniCoursesResponse = { data: MiniCourseApiRecord[] };
type MiniCourseResponse = { data: MiniCourseApiRecord };
type MiniCourseCommentsResponse = { data: MiniCourseCommentRecord[] };

export async function getMiniCoursesFromApi(): Promise<ApiResult<MiniCourseApiRecord[]>> {
  const path = '/mini-courses';
  const result = await getStaticJson<MiniCoursesResponse>(path, {
    ttlKey: 'cases',
    tags: ['mini-courses', 'public-mini-courses'],
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}

export async function getMiniCourseBySlugFromApi(
  slug: string,
): Promise<ApiResult<MiniCourseApiRecord | null>> {
  const path = `/mini-courses/${encodeURIComponent(slug)}`;
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

export async function getMiniCourseCommentsFromApi(
  slug: string,
): Promise<ApiResult<MiniCourseCommentRecord[]>> {
  const path = `/mini-courses/${encodeURIComponent(slug)}/comments`;
  const result = await getStaticJson<MiniCourseCommentsResponse>(path, {
    ttlKey: 'cases',
    tags: ['mini-courses', 'public-mini-courses', `mini-course:${slug}`],
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}
