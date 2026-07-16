'use client';

import { useCallback, useEffect, useState } from 'react';
import useSWR from 'swr';
import { getFeedUnreadSummary } from '@/lib/family/api';
import {
  FAMILY_FEED_READ_EVENT,
  getGlobalLastReadPostId,
} from '@/lib/family/feedReadCursor';
import { usePageVisible } from '@/lib/family/hooks/usePageVisible';
import { familySwrDefaults } from '@/lib/family/swr';

/** Unread family posts for the site "خانواده" nav badge (local cursor + API). */
export function useFamilyFeedUnreadCount(enabled = true) {
  const pageVisible = usePageVisible();
  const [afterId, setAfterId] = useState(0);

  const syncAfterId = useCallback(() => {
    setAfterId(getGlobalLastReadPostId());
  }, []);

  useEffect(() => {
    syncAfterId();
    const onRead = () => syncAfterId();
    const onStorage = (event: StorageEvent) => {
      if (!event.key || event.key.startsWith('family-feed-last-read-id')) syncAfterId();
    };
    window.addEventListener(FAMILY_FEED_READ_EVENT, onRead);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onRead);
    return () => {
      window.removeEventListener(FAMILY_FEED_READ_EVENT, onRead);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onRead);
    };
  }, [syncAfterId]);

  const { data, mutate } = useSWR(
    enabled && pageVisible && afterId > 0 ? ['family-feed-unread-summary', afterId] : null,
    async () => {
      try {
        return (await getFeedUnreadSummary(afterId)).data;
      } catch {
        return { unread_count: 0, latest_post_id: 0 };
      }
    },
    { refreshInterval: pageVisible ? 90_000 : 0, ...familySwrDefaults },
  );

  return {
    unreadCount: afterId > 0 ? (data?.unread_count ?? 0) : 0,
    latestPostId: data?.latest_post_id ?? 0,
    refresh: mutate,
  };
}
