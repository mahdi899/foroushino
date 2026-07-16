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

/** Best-effort cursor for the site header (last catch-up written on this browser). */
export function getGlobalLastReadPostId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const globalRaw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalRaw) {
      return Number.parseInt(globalRaw, 10) || 0;
    }
    // Legacy: pick any viewer cursor (do NOT take max id — ids ≠ chronological order).
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith('family-feed-last-read-id:')) continue;
      const value = Number.parseInt(localStorage.getItem(key) ?? '', 10) || 0;
      if (value > 0) return value;
    }
    return 0;
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

/** Persist the post id the member has caught up to (chronologically latest seen). */
export function setLastReadPostId(viewerKey: string | number, postId: number): void {
  if (typeof window === 'undefined' || postId <= 0) return;
  const current = getLastReadPostId(viewerKey);
  if (postId === current) return;
  try {
    localStorage.setItem(storageKey(viewerKey), String(postId));
    localStorage.setItem(GLOBAL_STORAGE_KEY, String(postId));
    emitFeedReadChanged(postId);
  } catch {
    /* ignore */
  }
}

/** Chronologically latest post id (feed array must be oldest → newest). */
export function chronologicalLatestPostId(postsAsc: { id: number }[]): number {
  if (postsAsc.length === 0) return 0;
  return postsAsc[postsAsc.length - 1]?.id ?? 0;
}

/**
 * Unread count after the catch-up cursor in chronological feed order.
 * Prefer position after lastRead id; fall back to id > lastRead when cursor missing from window.
 */
export function countUnreadPosts(postsAsc: { id: number }[] | number[], lastReadPostId: number): number {
  if (lastReadPostId <= 0) return 0;
  if (postsAsc.length === 0) return 0;

  if (typeof postsAsc[0] === 'number') {
    const ids = postsAsc as number[];
    return ids.reduce((n, id) => (id > lastReadPostId ? n + 1 : n), 0);
  }

  const posts = postsAsc as { id: number }[];
  const idx = posts.findIndex((p) => p.id === lastReadPostId);
  if (idx >= 0) return Math.max(0, posts.length - idx - 1);
  return posts.reduce((n, p) => (p.id > lastReadPostId ? n + 1 : n), 0);
}

export function firstUnreadPostId(
  postsAsc: { id: number }[] | number[],
  lastReadPostId: number,
): number | null {
  if (lastReadPostId <= 0) return null;

  if (typeof postsAsc[0] === 'number') {
    for (const id of postsAsc as number[]) {
      if (id > lastReadPostId) return id;
    }
    return null;
  }

  const posts = postsAsc as { id: number }[];
  const idx = posts.findIndex((p) => p.id === lastReadPostId);
  if (idx >= 0) {
    return idx + 1 < posts.length ? posts[idx + 1]!.id : null;
  }
  for (const p of posts) {
    if (p.id > lastReadPostId) return p.id;
  }
  return null;
}

/** True when the chronologically latest loaded post is newer than the catch-up cursor. */
export function hasUnreadSince(postsAsc: { id: number }[] | number[], lastReadPostId: number): boolean {
  if (lastReadPostId <= 0) return false;
  if (postsAsc.length === 0) return false;

  if (typeof postsAsc[0] === 'number') {
    const ids = postsAsc as number[];
    const maxId = ids.reduce((max, id) => Math.max(max, id), 0);
    return maxId > lastReadPostId;
  }

  const posts = postsAsc as { id: number }[];
  const latestId = chronologicalLatestPostId(posts);
  if (latestId === lastReadPostId) return false;
  return countUnreadPosts(posts, lastReadPostId) > 0;
}
