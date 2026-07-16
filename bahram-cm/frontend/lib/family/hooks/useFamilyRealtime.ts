'use client';

import { useEffect, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { getPost } from '@/lib/family/api';
import { feedPagesContainPost, prependPostToFeedPages, removePostFromFeedPages, replacePostInFeedPages, repositionPostToFeedTip } from '@/lib/family/feedMerge';
import { getEcho, isRealtimeConfigured } from '@/lib/realtime/echo';

export type FamilyFeedUpdatedPayload = {
  post_id: number;
  latest_post_id: number;
  published_at?: string | null;
  is_important?: boolean;
  event?: 'published' | 'pinned' | 'unpinned' | 'archived' | 'updated' | 'deleted';
};

type Options = {
  enabled?: boolean;
  /**
   * When true (default false), soft-merge new posts into every `family-feed` SWR cache.
   * FeedView should keep this false and merge itself based on jump/anchor state —
   * otherwise a far jump window gets corrupted by tip prepends.
   */
  syncFeed?: boolean;
  onFeedUpdated?: (payload: FamilyFeedUpdatedPayload) => void;
};

function isFeedUnreadKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed-unread-summary';
}

function isFamilyFeedKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed';
}

function isFamilyPinnedKey(key: unknown): boolean {
  return key === 'family-pinned' || (Array.isArray(key) && key[0] === 'family-pinned');
}

// Module-level refcount: multiple components (FeedView, FamilyNavButton, ...) subscribe to
// the same public `family.feed` Echo channel independently. Echo already dedupes the
// underlying `channel()` call by name, but `echo.leave(name)` unsubscribes it entirely —
// so we must only call `leave` once the *last* consumer unmounts, not on every unmount.
let familyFeedChannelRefCount = 0;

/** Soft-merge a published post into all live `family-feed` SWRInfinite caches (tip prepend). */
export async function mergePublishedPostIntoFeedCaches(postId: number): Promise<boolean> {
  let merged = false;

  await globalMutate(
    isFamilyFeedKey,
    async (current) => {
      if (!Array.isArray(current) || current.length === 0) return current;

      try {
        const res = await getPost(postId);
        const post = res.data;
        const alreadyLoaded = feedPagesContainPost(current, postId);
        const next = alreadyLoaded
          ? repositionPostToFeedTip(current, post)
          : prependPostToFeedPages(current, post);
        if (next && next !== current) {
          merged = true;
          return next;
        }
      } catch {
        /* caller may fall back to tip revalidate */
      }

      return current;
    },
    { revalidate: false },
  );

  return merged;
}

/** Patch an edited post in all live feed caches. */
export async function mergeUpdatedPostIntoFeedCaches(postId: number): Promise<boolean> {
  let merged = false;

  await globalMutate(
    isFamilyFeedKey,
    async (current) => {
      if (!Array.isArray(current) || current.length === 0) return current;
      if (!feedPagesContainPost(current, postId)) return current;

      try {
        const res = await getPost(postId);
        const next = replacePostInFeedPages(current, res.data);
        if (next && next !== current) {
          merged = true;
          return next;
        }
      } catch {
        /* ignore */
      }

      return current;
    },
    { revalidate: false },
  );

  return merged;
}

/** Remove deleted/archived posts from all live feed caches. */
export async function removePostFromFeedCaches(postId: number): Promise<boolean> {
  let removed = false;

  await globalMutate(
    isFamilyFeedKey,
    (current) => {
      if (!Array.isArray(current) || current.length === 0) return current;
      const next = removePostFromFeedPages(current, postId);
      if (next && next !== current) {
        removed = true;
        return next;
      }
      return current;
    },
    { revalidate: false },
  );

  return removed;
}

/** Force all live feed pages to refetch from the API (admin edit/delete safety net). */
export function revalidateFamilyFeedCaches(): void {
  void globalMutate(isFamilyFeedKey, undefined, { revalidate: true });
  void globalMutate(isFamilyPinnedKey);
}

/** Apply admin moderation to client feed caches immediately, then sync with server. */
export async function handleFeedModerationEvent(
  event: 'updated' | 'deleted' | 'archived',
  postId: number,
): Promise<void> {
  if (event === 'deleted' || event === 'archived') {
    await removePostFromFeedCaches(postId);
    revalidateFamilyFeedCaches();
    return;
  }

  const merged = await mergeUpdatedPostIntoFeedCaches(postId);
  void globalMutate(isFamilyPinnedKey);
  if (!merged) {
    revalidateFamilyFeedCaches();
  }
}

/**
 * Subscribe to public `family.feed` for feed lifecycle pings.
 * Always refreshes unread badge caches. Feed list sync is opt-in (`syncFeed`) so
 * FeedView can refuse merges while jumped away from the tip.
 */
export function useFamilyRealtime({
  enabled = true,
  syncFeed = false,
  onFeedUpdated,
}: Options = {}) {
  const onFeedUpdatedRef = useRef(onFeedUpdated);
  onFeedUpdatedRef.current = onFeedUpdated;
  const syncFeedRef = useRef(syncFeed);
  syncFeedRef.current = syncFeed;

  useEffect(() => {
    if (!enabled || !isRealtimeConfigured()) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel('family.feed');
    familyFeedChannelRefCount += 1;

    const handler = (payload: FamilyFeedUpdatedPayload) => {
      void (async () => {
        void globalMutate(isFeedUnreadKey);

        const event = payload.event ?? 'published';
        if (event === 'pinned' || event === 'unpinned' || event === 'archived' || event === 'deleted') {
          void globalMutate(isFamilyPinnedKey);
        }

        if (syncFeedRef.current) {
          if (event === 'published') {
            await mergePublishedPostIntoFeedCaches(payload.post_id);
          } else if (event === 'updated' || event === 'deleted' || event === 'archived') {
            await handleFeedModerationEvent(event, payload.post_id);
          }
        }

        onFeedUpdatedRef.current?.(payload);
      })();
    };

    channel.listen('.family.feed.updated', handler);

    return () => {
      channel.stopListening('.family.feed.updated', handler);
      familyFeedChannelRefCount = Math.max(0, familyFeedChannelRefCount - 1);
      if (familyFeedChannelRefCount === 0) {
        echo.leave('family.feed');
      }
    };
  }, [enabled]);
}
