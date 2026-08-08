'use client';

import useSWRInfinite from 'swr/infinite';
import { mutate as globalMutate } from 'swr';
import { useEffect, useMemo, useRef } from 'react';
import {
  feedBrowserCacheKey,
  mergeBrandingFromFeed,
  writeFeedBrowserCache,
} from '@/lib/family/browserCache';
import { getFeed, getFeedUnreadSummary, getPostJumpContext } from '@/lib/family/api';
import {
  getUnreadSummaryEtag,
  rememberUnreadSummary,
} from '@/lib/family/unreadSummaryCache';
import { readFeedCache, type FeedCachePage } from '@/lib/family/feedCache';
import { reconcileDiskCacheWithCurrent, latestPostIdFromPages } from '@/lib/family/feedMerge';
import { registerFamilyFeedPagesMutator } from '@/lib/family/feedPagesMutate';
import { shellBrandingFromFeedMeta, syncFamilyShellFromFeedMeta } from '@/lib/family/shellCache';
import { familyFeedSwr } from '@/lib/family/swr';
import { isRealtimeConfigured } from '@/lib/realtime/config';
import type { FamilyBranding, FamilyFeedMeta, FamilyPost } from '@/lib/family/types';

const FEED_PAGE_SIZE = 15;
const JUMP_WINDOW_SIZE = 24;
/** Cap rendered history so long sessions don't grow unbounded (virtualizer still helps DOM). */
const MAX_FEED_PAGES = 10;

interface FeedPage {
  data: FamilyPost[];
  meta: FamilyFeedMeta;
}

function newestPostInPages(pages: FeedPage[] | undefined): FamilyPost | null {
  const tip = pages?.[0]?.data?.[0];
  return tip ?? null;
}

function persistFeedPages(
  scope: 'guest' | 'member',
  viewerKey: string | number,
  pages: FeedPage[] | undefined,
): void {
  if (!pages?.length) return;
  const revision = pages[0]?.meta?.feed_revision ?? null;
  void writeFeedBrowserCache(scope, viewerKey, pages as FeedCachePage[], revision);
}

/** Fetch tip /feed only when server revision or tip id diverged from local cache. */
async function shouldRefreshFeedTip(
  localTipId: number,
  localRevision: number | null,
): Promise<boolean> {
  try {
    const result = await getFeedUnreadSummary(localTipId, getUnreadSummaryEtag());
    if (result.notModified) {
      return false;
    }
    rememberUnreadSummary(result.data, result.etag);
    const serverLatest = result.data.latest_post_id;
    const serverRev = result.data.feed_revision ?? null;
    if (serverLatest !== localTipId) return true;
    if (serverRev != null && localRevision != null && serverRev !== localRevision) return true;
    return false;
  } catch {
    // Keep disk paint; FeedView tip sync / realtime can recover.
    return false;
  }
}

export function useFamilyFeed(
  scope: 'guest' | 'member' = 'member',
  initialPage?: FeedPage | null,
  viewerKey: string | number = 'anon',
) {
  const fallbackData = initialPage ? [initialPage] : undefined;
  const hydratedFromDiskRef = useRef(false);
  const persistTimerRef = useRef<number | null>(null);
  const loadingNewerRef = useRef(false);
  const prevCursorRef = useRef<string | null>(null);
  const hasNewerRef = useRef(false);

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
    {
      fallbackData,
      ...familyFeedSwr,
      // Network is gated by IndexedDB hydrate + revision check below.
      revalidateOnMount: false,
    },
  );

  // Let feed realtime soft-patches (comment counts, etc.) update this infinite cache.
  useEffect(() => {
    return registerFamilyFeedPagesMutator(async (updater) => {
      await mutate(
        async (pages) => (await updater(pages as FeedCachePage[] | undefined)) as FeedPage[] | undefined,
        { revalidate: false },
      );
    });
  }, [mutate]);

  // IndexedDB-first paint, then lightweight revision check — skip /feed when unchanged.
  useEffect(() => {
    if (hydratedFromDiskRef.current) return;
    hydratedFromDiskRef.current = true;

    let cancelled = false;

    void (async () => {
      const record = await readFeedCache(scope, viewerKey);
      if (cancelled) return;

      const cached = record?.pages?.length ? (record.pages as FeedPage[]) : null;
      const diskRevision = record?.revision ?? null;

      if (cached) {
        await mutate(
          (current) => {
            const network = current as FeedPage[] | undefined;
            if (!network?.length) return cached;

            const networkTipId = latestPostIdFromPages(network);
            const diskTipId = latestPostIdFromPages(cached);

            if (diskTipId > networkTipId) {
              return reconcileDiskCacheWithCurrent(network, cached);
            }
            if (diskTipId < networkTipId) {
              if (network.length >= cached.length) return network;
              const tip = network[0];
              return tip ? [tip, ...cached.slice(1)] : network;
            }

            return reconcileDiskCacheWithCurrent(network, cached);
          },
          { revalidate: false },
        );
      } else if (!initialPage) {
        await mutate(
          async () => [(await getFeed(null, FEED_PAGE_SIZE)) as FeedPage],
          { revalidate: false },
        );
        return;
      }

      if (cancelled) return;

      const localTipId =
        (cached ? latestPostIdFromPages(cached) : 0) ||
        (initialPage ? latestPostIdFromPages([initialPage]) : 0);
      const localRevision =
        diskRevision ?? initialPage?.meta?.feed_revision ?? null;

      if (localTipId <= 0) return;

      const needsRefresh = await shouldRefreshFeedTip(localTipId, localRevision);
      if (cancelled || !needsRefresh) return;

      await mutate(
        async (pages) => {
          const fresh = (await getFeed(null, FEED_PAGE_SIZE)) as FeedPage;
          if (!pages?.length) return [fresh];
          return [fresh, ...pages.slice(1)];
        },
        { revalidate: false },
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [initialPage, mutate, scope, viewerKey]);

  // Without realtime, rare deferred check — still revision-gated (no blind /feed).
  useEffect(() => {
    if (!initialPage || isRealtimeConfigured()) return;
    const timer = window.setTimeout(() => {
      const tipId =
        latestPostIdFromPages((data as FeedPage[] | undefined) ?? [initialPage]) || 0;
      const revision =
        (data as FeedPage[] | undefined)?.[0]?.meta?.feed_revision ??
        initialPage.meta?.feed_revision ??
        null;
      if (tipId <= 0) return;
      void shouldRefreshFeedTip(tipId, revision).then((needs) => {
        if (!needs) return;
        void mutate(
          async (pages) => {
            if (!pages?.length) return pages;
            const fresh = (await getFeed(null, FEED_PAGE_SIZE)) as FeedPage;
            return [fresh, ...pages.slice(1)];
          },
          { revalidate: false },
        );
      });
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, [data, initialPage, mutate, scope, viewerKey]);

  useEffect(() => {
    if (!data?.length) return;
    if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      persistFeedPages(scope, viewerKey, data as FeedPage[]);
    }, 400);

    return () => {
      if (persistTimerRef.current != null) window.clearTimeout(persistTimerRef.current);
    };
  }, [data, scope, viewerKey]);

  useEffect(() => {
    const tipMeta = data?.[0]?.meta;
    if (!tipMeta) return;

    syncFamilyShellFromFeedMeta(tipMeta, viewerKey);
    const fromFeed = shellBrandingFromFeedMeta(tipMeta);
    if (fromFeed) {
      void globalMutate(
        'family-branding',
        (current) => mergeBrandingFromFeed(current as FamilyBranding | undefined, fromFeed),
        { revalidate: true },
      );
    }

    if (tipMeta.prev_cursor != null) prevCursorRef.current = tipMeta.prev_cursor;
    if (typeof tipMeta.has_newer === 'boolean') hasNewerRef.current = tipMeta.has_newer;
  }, [data, viewerKey]);

  // Must stay referentially stable across renders: FeedView derives `feedItems`,
  // virtual row props and several DOM-measuring effects from this array, so a fresh
  // array every render re-renders every mounted PostCard and forces layout reads.
  const posts = useMemo(
    () => (data ? data.flatMap((page) => page.data).reverse() : []),
    [data],
  );
  const lastPage = data?.[data.length - 1];
  const hasMore = Boolean(lastPage?.meta.next_cursor);
  const hasNewer = Boolean(data?.[0]?.meta.has_newer ?? hasNewerRef.current);
  const meta = data?.[0]?.meta;

  const jumpToPost = async (postId: number): Promise<{ hasNewer: boolean }> => {
    const res = await getPostJumpContext(postId, JUMP_WINDOW_SIZE);
    const prevMeta = data?.[0]?.meta ?? {
      next_cursor: null,
      guest: false,
      display_name: '',
    };
    const nextPage: FeedPage = {
      data: res.data,
      meta: {
        ...prevMeta,
        next_cursor: res.meta.next_cursor,
        prev_cursor: res.meta.prev_cursor ?? null,
        has_newer: res.meta.has_newer,
        has_older: res.meta.has_older,
      },
    };
    prevCursorRef.current = res.meta.prev_cursor ?? null;
    hasNewerRef.current = res.meta.has_newer;
    await mutate([nextPage], { revalidate: false });
    setSize(1);
    persistFeedPages(scope, viewerKey, [nextPage]);
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
      prevCursorRef.current = null;
      hasNewerRef.current = false;
      persistFeedPages(scope, viewerKey, next as FeedPage[]);
    }
    return next;
  };

  const loadNewer = async (): Promise<boolean> => {
    if (loadingNewerRef.current) return false;
    const cursor = prevCursorRef.current ?? data?.[0]?.meta.prev_cursor ?? null;
    if (!cursor && !hasNewerRef.current && !data?.[0]?.meta.has_newer) return false;

    loadingNewerRef.current = true;
    try {
      const tip = newestPostInPages(data);
      const res = (await getFeed(cursor, FEED_PAGE_SIZE, 'newer')) as FeedPage;
      if (!res.data.length) {
        hasNewerRef.current = false;
        await mutate(
          (pages) => {
            if (!pages?.length) return pages;
            const first = pages[0];
            return [
              {
                ...first,
                meta: { ...first.meta, has_newer: false, prev_cursor: null },
              },
              ...pages.slice(1),
            ];
          },
          { revalidate: false },
        );
        return false;
      }

      await mutate(
        (pages) => {
          if (!pages?.length) return [res];
          const first = pages[0];
          const existingIds = new Set(first.data.map((p) => p.id));
          const incoming = res.data.filter((p) => !existingIds.has(p.id));
          const mergedData = [...incoming, ...first.data];
          const encodedPrev: string | null =
            res.meta.has_newer && mergedData[0] ? (res.meta.prev_cursor ?? null) : null;

          hasNewerRef.current = Boolean(res.meta.has_newer);
          prevCursorRef.current = encodedPrev;

          return [
            {
              ...first,
              data: mergedData,
              meta: {
                ...first.meta,
                ...res.meta,
                next_cursor: first.meta.next_cursor,
                prev_cursor: encodedPrev,
                has_newer: Boolean(res.meta.has_newer),
              },
            },
            ...pages.slice(1),
          ];
        },
        { revalidate: false },
      );

      if (!res.meta.has_newer && tip) {
        /* caller checks hasNewer */
      }
      return true;
    } finally {
      loadingNewerRef.current = false;
    }
  };

  const loadMore = () => {
    const pageCount = data?.length ?? size;
    if (pageCount >= MAX_FEED_PAGES) {
      void mutate(
        (pages) => {
          if (!pages || pages.length < 2) return pages;
          const rest = pages.slice(1);
          const newTip = rest[0];
          if (!newTip) return pages;
          hasNewerRef.current = true;
          const newest = newTip.data[0];
          prevCursorRef.current = newest ? null : prevCursorRef.current;
          return [
            {
              ...newTip,
              meta: {
                ...newTip.meta,
                has_newer: true,
                prev_cursor: newTip.meta.prev_cursor ?? null,
              },
            },
            ...rest.slice(1),
          ];
        },
        { revalidate: false },
      );
      setSize(Math.max(1, pageCount - 1 + 1));
      return;
    }
    setSize(size + 1);
  };

  return {
    posts,
    meta,
    isLoading,
    isValidating,
    error,
    hasMore,
    hasNewer,
    loadMore,
    loadNewer,
    jumpToPost,
    mutate,
    revalidateTip,
    feedCacheKey: feedBrowserCacheKey(scope, viewerKey),
  };
}
