import { postJson, type ApiResult } from './api';
import type { ContentCommentRecord, ContentCommentType } from './contentComments.types';

type CommentSubmitResponse = {
  data: { id: number; status: string; message: string };
};

export async function submitContentComment(
  type: ContentCommentType,
  slug: string,
  input: {
    author_name?: string;
    author_email?: string;
    body: string;
    captcha_token?: string;
    captcha_id?: string;
    captcha_answer?: string;
    website?: string;
  },
  options?: { authToken?: string },
): Promise<ApiResult<{ id: number; status: string; message: string }>> {
  const headers: Record<string, string> = {};
  if (options?.authToken) {
    headers.Authorization = `Bearer ${options.authToken}`;
  }

  const result = await postJson<CommentSubmitResponse>(
    `/content/${type}/${encodeURIComponent(slug)}/comments`,
    input,
    { headers },
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.data };
}

export type { ContentCommentRecord, ContentCommentType };
