const storageKey = (viewerKey: string | number) =>
  `family-feed-last-read-id:${String(viewerKey)}`;

export function getLastReadPostId(viewerKey: string | number): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(storageKey(viewerKey));
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Persist the highest post id the member has caught up to. */
export function setLastReadPostId(viewerKey: string | number, postId: number): void {
  if (typeof window === 'undefined' || postId <= 0) return;
  const current = getLastReadPostId(viewerKey);
  if (postId <= current) return;
  try {
    localStorage.setItem(storageKey(viewerKey), String(postId));
  } catch {
    /* ignore */
  }
}

export function countUnreadPosts(postIds: number[], lastReadPostId: number): number {
  if (lastReadPostId <= 0) return 0;
  return postIds.reduce((n, id) => (id > lastReadPostId ? n + 1 : n), 0);
}

export function firstUnreadPostId(postIdsSortedAsc: number[], lastReadPostId: number): number | null {
  for (const id of postIdsSortedAsc) {
    if (id > lastReadPostId) return id;
  }
  return null;
}

/** True only when the feed has posts newer than the member's catch-up cursor. */
export function hasUnreadSince(postIds: number[], lastReadPostId: number): boolean {
  if (postIds.length === 0) return false;
  const maxId = postIds.reduce((max, id) => Math.max(max, id), 0);
  // First visit (no cursor): treat as caught up after we land on latest.
  if (lastReadPostId <= 0) return false;
  return maxId > lastReadPostId;
}
