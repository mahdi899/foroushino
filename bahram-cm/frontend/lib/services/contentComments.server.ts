import 'server-only';

import type { ApiResult } from './api';
import { getStaticJson } from './staticFetch';
import type { ContentCommentRecord, ContentCommentType } from './contentComments.types';

type CommentsResponse = { data: ContentCommentRecord[] };

export async function getContentCommentsFromApi(
  type: ContentCommentType,
  slug: string,
): Promise<ApiResult<ContentCommentRecord[]>> {
  const path = `/content/${type}/${encodeURIComponent(slug)}/comments`;
  const result = await getStaticJson<CommentsResponse>(path, {
    ttlKey: 'cases',
    tags: ['content-comments', `content-comments:${type}:${slug}`],
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.data ?? [] };
}
