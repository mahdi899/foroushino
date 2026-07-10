import { postJson, type ApiResult } from './api';
import type { MiniCourseCommentRecord } from './miniCourses.types';

type CommentSubmitResponse = {
  data: { id: number; status: string; message: string };
};

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

export type { MiniCourseCommentRecord };
