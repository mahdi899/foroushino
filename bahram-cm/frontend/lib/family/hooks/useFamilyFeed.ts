'use client';

import useSWRInfinite from 'swr/infinite';
import { getFeed, getPostJumpContext } from '@/lib/family/api';
import { familySwrDefaults } from '@/lib/family/swr';
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
    { fallbackData, revalidateFirstPage: true, revalidateOnMount: true, ...familySwrDefaults },
  );

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
    return { hasNewer: res.meta.has_newer };
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
  };
}
