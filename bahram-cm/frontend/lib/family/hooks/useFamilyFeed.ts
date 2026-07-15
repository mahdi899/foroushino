'use client';

import useSWRInfinite from 'swr/infinite';
import { getFeed } from '@/lib/family/api';
import type { FamilyFeedMeta, FamilyPost } from '@/lib/family/types';

const FEED_PAGE_SIZE = 15;

interface FeedPage {
  data: FamilyPost[];
  meta: FamilyFeedMeta;
}

export function useFamilyFeed(scope: 'guest' | 'member' = 'member', initialPage?: FeedPage | null) {
  const fallbackData = initialPage ? [initialPage] : undefined;

  const { data, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite<FeedPage>(
    (index, previousPage) => {
      if (previousPage && !previousPage.meta.next_cursor) return null;
      return ['family-feed', scope, FEED_PAGE_SIZE, index === 0 ? null : previousPage?.meta.next_cursor];
    },
    async ([, , , cursor]) => (await getFeed(cursor as string | null, FEED_PAGE_SIZE)) as FeedPage,
    { fallbackData, revalidateFirstPage: true, revalidateOnFocus: false },
  );

  const posts = data ? [...data.flatMap((page) => page.data)].reverse() : [];
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage?.meta.next_cursor);
  const meta = data?.[0]?.meta;

  return {
    posts,
    meta,
    isLoading,
    isValidating,
    error,
    hasMore,
    loadMore: () => setSize(size + 1),
    mutate,
  };
}
