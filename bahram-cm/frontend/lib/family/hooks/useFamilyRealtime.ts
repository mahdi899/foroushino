'use client';

import { useEffect, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { getPost } from '@/lib/family/api';
import { feedPagesContainPost, prependPostToFeedPages } from '@/lib/family/feedMerge';
import { getEcho, isRealtimeConfigured } from '@/lib/realtime/echo';

export type FamilyFeedUpdatedPayload = {
  post_id: number;
  latest_post_id: number;
  published_at?: string | null;
  is_important?: boolean;
  event?: 'published' | 'pinned' | 'unpinned' | 'archived';
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
      if (feedPagesContainPost(current, postId)) return current;

      try {
        const res = await getPost(postId);
        const next = prependPostToFeedPages(current, res.data);
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
        if (event === 'pinned' || event === 'unpinned' || event === 'archived') {
          void globalMutate(isFamilyPinnedKey);
        }

        if (syncFeedRef.current && event === 'published') {
          await mergePublishedPostIntoFeedCaches(payload.post_id);
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
