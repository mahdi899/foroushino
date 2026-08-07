import type { FamilyComment } from '@/lib/family/types';

export type FamilyCommentChangedAction = 'created' | 'approved' | 'updated' | 'removed';

export type FamilyCommentChangedPayload = {
  action: FamilyCommentChangedAction;
  post_id: number;
  family_id: number;
  comment_id: number;
  approved_comments_count?: number;
  comment?: FamilyComment;
};

export type FamilyCommentsPage = {
  data: FamilyComment[];
  meta: { next_cursor: string | null; family_id?: number };
};

function upsertComment(list: FamilyComment[], comment: FamilyComment): FamilyComment[] {
  const index = list.findIndex((c) => c.id === comment.id);
  if (index >= 0) {
    const next = list.slice();
    const prev = next[index]!;
    next[index] = {
      ...prev,
      ...comment,
      replies: comment.replies ?? prev.replies ?? [],
      is_mine: comment.is_mine ?? prev.is_mine,
      is_pending_mine: comment.is_pending_mine ?? false,
    };
    return next;
  }
  return [comment, ...list];
}

function patchInRootsAndReplies(
  list: FamilyComment[],
  commentId: number,
  patch: (c: FamilyComment) => FamilyComment | null,
): FamilyComment[] {
  let changed = false;
  const next = list.flatMap((root) => {
    if (root.id === commentId) {
      changed = true;
      const patched = patch(root);
      return patched ? [patched] : [];
    }

    const replies = root.replies ?? [];
    const replyIndex = replies.findIndex((r) => r.id === commentId);
    if (replyIndex < 0) return [root];

    changed = true;
    const nextReplies = replies.flatMap((r, i) => {
      if (i !== replyIndex) return [r];
      const patched = patch(r);
      return patched ? [patched] : [];
    });
    return [{ ...root, replies: nextReplies }];
  });

  return changed ? next : list;
}

function attachReply(list: FamilyComment[], comment: FamilyComment): FamilyComment[] {
  const rootId = comment.parent_id;
  if (!rootId) return upsertComment(list, comment);

  let found = false;
  const next = list.map((root) => {
    if (root.id !== rootId) return root;
    found = true;
    const replies = root.replies ?? [];
    const existing = replies.findIndex((r) => r.id === comment.id);
    if (existing >= 0) {
      const updated = replies.slice();
      updated[existing] = { ...replies[existing]!, ...comment, is_pending_mine: false };
      return { ...root, replies: updated };
    }
    return { ...root, replies: [...replies, comment] };
  });

  // Root not in loaded pages — ignore (pagination); avoid orphan insert as root.
  return found ? next : list;
}

/** Idempotent local merge for comment realtime events (no network). */
export function applyCommentRealtimeEvent(
  current: FamilyCommentsPage | undefined,
  event: FamilyCommentChangedPayload,
): FamilyCommentsPage | undefined {
  if (!current) {
    if (
      (event.action === 'created' || event.action === 'approved') &&
      event.comment &&
      !event.comment.parent_id
    ) {
      return {
        data: [event.comment],
        meta: { next_cursor: null, family_id: event.family_id },
      };
    }
    return current;
  }

  const list = current.data;

  switch (event.action) {
    case 'created':
    case 'approved': {
      if (!event.comment) return current;
      const comment = { ...event.comment, is_pending_mine: false, status: 'approved' as const };
      const data = comment.parent_id
        ? attachReply(list, comment)
        : upsertComment(list, comment);
      return data === list ? current : { ...current, data };
    }
    case 'updated': {
      if (!event.comment) return current;
      const data = patchInRootsAndReplies(list, event.comment_id, (c) => ({
        ...c,
        ...event.comment!,
        replies: event.comment!.replies ?? c.replies,
        is_pending_mine: false,
      }));
      return data === list ? current : { ...current, data };
    }
    case 'removed': {
      const data = patchInRootsAndReplies(list, event.comment_id, () => null);
      return data === list ? current : { ...current, data };
    }
    default:
      return current;
  }
}

/** Apply the same event to the extra (paginated) comments list. */
export function applyCommentRealtimeEventToList(
  list: FamilyComment[],
  event: FamilyCommentChangedPayload,
): FamilyComment[] {
  const page = applyCommentRealtimeEvent({ data: list, meta: { next_cursor: null } }, event);
  return page?.data ?? list;
}
