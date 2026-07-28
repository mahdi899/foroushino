'use client';

export const POST_COMMENT_PARAM = 'post_comment';

export type ContentCommentDraft = {
  type: string;
  slug: string;
  authorName: string;
  body: string;
};

function draftKey(type: string, slug: string) {
  return `content-comment-draft:${type}:${slug}`;
}

export function saveContentCommentDraft(draft: ContentCommentDraft): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(draftKey(draft.type, draft.slug), JSON.stringify(draft));
  } catch {
    // ignore quota / private mode
  }
}

export function readContentCommentDraft(type: string, slug: string): ContentCommentDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(draftKey(type, slug));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ContentCommentDraft;
    if (!parsed?.body?.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearContentCommentDraft(type: string, slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(draftKey(type, slug));
  } catch {
    // ignore
  }
}

export function buildCommentLoginReturnUrl(pathname: string, search: string): string {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  query.set(POST_COMMENT_PARAM, '1');
  const qs = query.toString();
  return qs ? `${pathname}?${qs}` : `${pathname}?${POST_COMMENT_PARAM}=1`;
}
