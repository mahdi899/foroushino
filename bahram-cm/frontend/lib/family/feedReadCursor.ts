const storageKey = (viewerKey: string | number) =>
  `family-feed-last-read-id:${String(viewerKey)}`;

const GLOBAL_STORAGE_KEY = 'family-feed-last-read-id';

/** Written by site nav when badge > 0; consumed once on Family feed boot. */
export const FAMILY_ENTER_UNREAD_AFTER_KEY = 'family-enter-unread-after';

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

/** Site header / any-surface cursor (single browser catch-up pointer). */
export function getGlobalLastReadPostId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const globalRaw = localStorage.getItem(GLOBAL_STORAGE_KEY);
    if (globalRaw) {
      return Number.parseInt(globalRaw, 10) || 0;
    }
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

/**
 * Cursor used for unread UX for this viewer.
 * Do not inherit another viewer's global cursor on first enter — that lands
 * the feed on old posts instead of the tip after login/join.
 */
export function resolveUnreadCursor(
  viewerKey: string | number,
  postsAsc: { id: number }[],
): number {
  const handoff = peekEnterUnreadAfter();
  if (handoff > 0) return handoff;

  const local = getLastReadPostId(viewerKey);
  if (local <= 0) return 0;

  if (postsAsc.length > 0 && hasUnreadSince(postsAsc, local)) return local;
  return local;
}

export function peekEnterUnreadAfter(): number {
  if (typeof window === 'undefined') return 0;
  try {
    return Number.parseInt(sessionStorage.getItem(FAMILY_ENTER_UNREAD_AFTER_KEY) ?? '', 10) || 0;
  } catch {
    return 0;
  }
}

export function consumeEnterUnreadAfter(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(FAMILY_ENTER_UNREAD_AFTER_KEY);
  } catch {
    /* ignore */
  }
}

/** Remember the nav badge cursor so Family can land on the last-seen post. */
export function stashEnterUnreadAfter(afterId: number): void {
  if (typeof window === 'undefined' || afterId <= 0) return;
  try {
    sessionStorage.setItem(FAMILY_ENTER_UNREAD_AFTER_KEY, String(afterId));
  } catch {
    /* ignore */
  }
}

/** Persist the post id the member has caught up to (chronologically latest seen). */
export function setLastReadPostId(viewerKey: string | number, postId: number): void {
  if (typeof window === 'undefined' || postId <= 0) return;
  try {
    const local = getLastReadPostId(viewerKey);
    const global = getGlobalLastReadPostId();
    if (postId === local && postId === global) return;
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

/** True when the chronologically latest post intersects the feed viewport. */
export function isFeedTipInView(
  root: HTMLElement,
  latestPostId: number,
  distanceFromBottom?: number,
): boolean {
  if (latestPostId <= 0) return false;
  const el = document.getElementById(`family-post-${latestPostId}`);
  if (el) {
    const rootRect = root.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    return elRect.top < rootRect.bottom - 8 && elRect.bottom > rootRect.top + 8;
  }
  // Virtualized tip not mounted — near the bottom counts as tip in view.
  if (typeof distanceFromBottom === 'number' && distanceFromBottom < 120) {
    return true;
  }
  return false;
}

/**
 * How many posts after `lastReadPostId` are still entirely below the viewport.
 * Binary-searches post tops — O(log n) layout reads instead of measuring every post.
 */
export function countUnreadStillBelow(
  postsAsc: { id: number }[],
  lastReadPostId: number,
  root: HTMLElement,
): number {
  if (lastReadPostId <= 0 || postsAsc.length === 0) return 0;

  const start = postsAsc.findIndex((p) => p.id === lastReadPostId);
  const from = start >= 0 ? start + 1 : postsAsc.findIndex((p) => p.id > lastReadPostId);
  if (from < 0 || from >= postsAsc.length) return 0;

  const rootBottom = root.getBoundingClientRect().bottom - 4;
  let lo = from;
  let hi = postsAsc.length;

  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const el = document.getElementById(`family-post-${postsAsc[mid]!.id}`);
    if (!el) {
      // Not mounted yet — treat as still below.
      hi = mid;
      continue;
    }
    if (el.getBoundingClientRect().top > rootBottom) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }

  return postsAsc.length - lo;
}
