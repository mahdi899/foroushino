const storageKey = (viewerKey: string | number) =>
  `family-feed-last-read-id:${String(viewerKey)}`;

const GLOBAL_STORAGE_KEY = 'family-feed-last-read-id';

/** Dispatched when the catch-up cursor changes — site nav badge listens. */
export const FAMILY_FEED_READ_EVENT = 'family-feed-read';

export function getLastReadPostId(viewerKey: string | number): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(storageKey(viewerKey));
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

/** Best-effort cursor for the site header (any family session on this browser). */
export function getGlobalLastReadPostId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const globalRaw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    let max = globalRaw ? Number.parseInt(globalRaw, 10) || 0 : 0;
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('family-feed-last-read-id:')) continue;
      const value = Number.parseInt(localStorage.getItem(key) ?? '', 10) || 0;
      if (value > max) max = value;
    }
    return max;
  } catch {
    return 0;
  }
}

function emitFeedReadChanged(postId: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(FAMILY_FEED_READ_EVENT, { detail: { postId } }));
  } catch {
    /* ignore */
  }
}

/** Persist the highest post id the member has caught up to. */
export function setLastReadPostId(viewerKey: string | number, postId: number): void {
  if (typeof window === 'undefined' || postId <= 0) return;
  const current = getLastReadPostId(viewerKey);
  if (postId <= current) return;
  try {
    localStorage.setItem(storageKey(viewerKey), String(postId));
    const globalCurrent = Number.parseInt(localStorage.getItem(GLOBAL_STORAGE_KEY) ?? '', 10) || 0;
    if (postId > globalCurrent) {
      localStorage.setItem(GLOBAL_STORAGE_KEY, String(postId));
    }
    emitFeedReadChanged(postId);
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
