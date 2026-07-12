'use server';

import { submitContentComment } from '@/lib/services/contentComments.client';
import type { ContentCommentType } from '@/lib/services/contentComments.types';
import { getStudentToken } from '@/lib/student/session';

export async function submitContentCommentAction(
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
) {
  const token = await getStudentToken();
  return submitContentComment(type, slug, input, { authToken: token });
}
