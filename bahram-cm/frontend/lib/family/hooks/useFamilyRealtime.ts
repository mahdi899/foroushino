'use client';

import { useEffect, useRef } from 'react';
import { mutate as globalMutate } from 'swr';
import { getEcho, isRealtimeConfigured } from '@/lib/realtime/echo';

export type FamilyFeedUpdatedPayload = {
  post_id: number;
  latest_post_id: number;
  published_at?: string | null;
  is_important?: boolean;
};

type Options = {
  enabled?: boolean;
  onFeedUpdated?: (payload: FamilyFeedUpdatedPayload) => void;
};

function isFeedUnreadKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed-unread-summary';
}

function isFamilyFeedKey(key: unknown): boolean {
  return Array.isArray(key) && key[0] === 'family-feed';
}

// Module-level refcount: multiple components (FeedView, FamilyNavButton, ...) subscribe to
// the same public `family.feed` Echo channel independently. Echo already dedupes the
// underlying `channel()` call by name, but `echo.leave(name)` unsubscribes it entirely —
// so we must only call `leave` once the *last* consumer unmounts, not on every unmount.
let familyFeedChannelRefCount = 0;

/**
 * Subscribe to public `family.feed` for new published posts.
 * Mutates nav unread summary + feed SWR caches; optional callback for UI (jump badge).
 */
export function useFamilyRealtime({ enabled = true, onFeedUpdated }: Options = {}) {
  const onFeedUpdatedRef = useRef(onFeedUpdated);
  onFeedUpdatedRef.current = onFeedUpdated;

  useEffect(() => {
    if (!enabled || !isRealtimeConfigured()) return;

    const echo = getEcho();
    if (!echo) return;

    const channel = echo.channel('family.feed');
    familyFeedChannelRefCount += 1;

    const handler = (payload: FamilyFeedUpdatedPayload) => {
      void globalMutate(isFeedUnreadKey);
      void globalMutate(isFamilyFeedKey);
      onFeedUpdatedRef.current?.(payload);
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
