'use client';

import useSWRInfinite from 'swr/infinite';
import { mutate as globalMutate } from 'swr';
import { useEffect, useRef } from 'react';
import { getFeed, getPost, getPostJumpContext } from '@/lib/family/api';
import { readFeedCache, writeFeedCache, type FeedCachePage } from '@/lib/family/feedCache';
import { shellBrandingFromFeedMeta, syncFamilyShellFromFeedMeta } from '@/lib/family/shellCache';
import { familyFeedSwr } from '@/lib/family/swr';
import type { FamilyFeedMeta, FamilyPost } from '@/lib/family/types';

const FEED_PAGE_SIZE = 15;
const JUMP_WINDOW_SIZE = 24;

interface FeedPage {
  data: FamilyPost[];
  meta: FamilyFeedMeta;
}

export function useFamilyFeed(
  scope: 'guest' | 'member' = 'member',
  initialPage?: FeedPage | null,
  viewerKey: string | number = 'anon',
) {
  const fallbackData = initialPage ? [initialPage] : undefined;
  const hydratedFromDiskRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<FeedPage>(
    (index, previousPage) => {
      if (previousPage && !previousPage.meta.next_cursor) return null;
      return [
        'family-feed',
        scope,
        viewerKey,
        FEED_PAGE_SIZE,
        index === 0 ? null : previousPage?.meta.next_cursor,
      ];
    },
    async ([, , , , cursor]) => (await getFeed(cursor as string | null, FEED_PAGE_SIZE)) as FeedPage,
    { fallbackData, ...familyFeedSwr },
  );

  useEffect(() => {
    if (hydratedFromDiskRef.current) return;
    hydratedFromDiskRef.current = true;

    let cancelled = false;
    void readFeedCache(scope, viewerKey).then((cached) => {
      if (cancelled || !cached?.length) return;

      void mutate(
        (current) => {
          if (current && current.length >= cached.length) return current;
          return cached as FeedPage[];
        },
        { revalidate: false },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [mutate, scope, viewerKey]);

  useEffect(() => {
    if (!data?.length) return;
    if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      void writeFeedCache(scope, viewerKey, data as FeedCachePage[]);
    }, 400);

    return () => {
      if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    };
  }, [data, scope, viewerKey]);

  useEffect(() => {
    const feedMeta = data?.[0]?.meta;
    if (!feedMeta) return;
    syncFamilyShellFromFeedMeta(feedMeta);
    const branding = shellBrandingFromFeedMeta(feedMeta);
    if (branding) {
      void globalMutate('family-branding', branding, { revalidate: false });
    }
  }, [data]);

  const posts = data ? [...data.flatMap((page) => page.data)].reverse() : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage?.meta.next_cursor);
  const meta = data?.[0]?.meta;

  /**
   * Replace the whole loaded window with a chronological slice centered on `postId` —
   * used when "jump to message" (e.g. an old pinned post) targets a post far outside
   * the currently loaded pages. Keeps non-cursor meta (branding, is_staff, ...) intact
   * so the rest of the feed chrome doesn't regress after a jump.
   */
  const jumpToPost = async (postId: number): Promise<{ hasNewer: boolean }> => {
    const res = await getPostJumpContext(postId, JUMP_WINDOW_SIZE);
    const prevMeta = data?.[0]?.meta ?? {
      next_cursor: null,
      guest: false,
      display_name: '',
    };
    const nextPage: FeedPage = {
      data: res.data,
      meta: { ...prevMeta, next_cursor: res.meta.next_cursor },
    };
    await mutate([nextPage], { revalidate: false });
    setSize(1);
    void writeFeedCache(scope, viewerKey, [nextPage]);
    return { hasNewer: res.meta.has_newer };
  };

  const revalidateTip = async () => {
    const next = await mutate(
      async (pages) => {
        const fresh = (await getFeed(null, FEED_PAGE_SIZE)) as FeedPage;
        if (!pages?.length) return [fresh];
        return [fresh, ...pages.slice(1)];
      },
      { revalidate: false },
    );
    if (Array.isArray(next) && next.length) {
      void writeFeedCache(scope, viewerKey, next as FeedCachePage[]);
    }
    return next;
  };

  return {
    posts,
    meta,
    isLoading,
    isValidating,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    jumpToPost,
    mutate,
    revalidateTip,
  };
}
