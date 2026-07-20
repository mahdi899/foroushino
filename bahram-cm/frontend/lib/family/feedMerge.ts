import type { FeedCachePage } from '@/lib/family/feedCache';
import type { FamilyPost } from '@/lib/family/types';

/** API pages are newest-first; prepend keeps the tip page ordered correctly. */
export function prependPostToFeedPages(
  pages: FeedCachePage[] | undefined,
  post: FamilyPost,
): FeedCachePage[] | undefined {
  if (!pages?.length) return pages;

  const first = pages[0];
  if (!first) return pages;
  if (first.data.some((item) => item.id === post.id)) return pages;

  const nextFirst: FeedCachePage = {
    ...first,
    data: [post, ...first.data],
  };

  return [nextFirst, ...pages.slice(1)];
}

export function removePostFromFeedPages(
  pages: FeedCachePage[] | undefined,
  postId: number,
): FeedCachePage[] | undefined {
  if (!pages?.length) return pages;

  let changed = false;
  const next = pages
    .map((page) => {
      const data = page.data.filter((item) => item.id !== postId);
      if (data.length !== page.data.length) changed = true;
      return data.length === page.data.length ? page : { ...page, data };
    })
    .filter((page) => page.data.length > 0);

  return changed ? next : pages;
}

/** Republish: remove existing copy then prepend at feed tip. */
export function repositionPostToFeedTip(
  pages: FeedCachePage[] | undefined,
  post: FamilyPost,
): FeedCachePage[] | undefined {
  const stripped = removePostFromFeedPages(pages, post.id) ?? pages;
  return prependPostToFeedPages(stripped, post) ?? stripped;
}

export function replacePostInFeedPages(
  pages: FeedCachePage[] | undefined,
  post: FamilyPost,
): FeedCachePage[] | undefined {
  if (!pages?.length) return pages;

  let changed = false;
  const next = pages.map((page) => {
    const index = page.data.findIndex((item) => item.id === post.id);
    if (index < 0) return page;
    changed = true;
    const data = page.data.slice();
    data[index] = post;
    return { ...page, data };
  });

  return changed ? next : pages;
}

export function feedPagesContainPost(pages: FeedCachePage[] | undefined, postId: number): boolean {
  return Boolean(pages?.some((page) => page.data.some((item) => item.id === postId)));
}

export function latestPostIdFromPages(pages: FeedCachePage[] | undefined): number {
  if (!pages?.length) return 0;
  const tip = pages[0]?.data[0];
  return tip?.id ?? 0;
}

/**
 * Merge IndexedDB scroll depth with live SWR pages without downgrading the feed tip.
 * - Fresher network tip: trust live data (disk may still list admin-deleted posts).
 * - Fresher disk tip: trust IndexedDB (e.g. publish persisted before network revalidated).
 * - Same tip id: keep the fresher tip page and restore depth from whichever has more pages.
 */
export function reconcileDiskCacheWithCurrent(
  current: FeedCachePage[] | undefined,
  cached: FeedCachePage[],
): FeedCachePage[] {
  if (!cached.length) return current ?? [];
  if (!current?.length) return cached;

  const currentTipId = latestPostIdFromPages(current);
  const cachedTipId = latestPostIdFromPages(cached);

  if (currentTipId === cachedTipId) {
    if (current.length >= cached.length) return current;
    const tip = current[0];
    return tip ? [tip, ...cached.slice(1)] : cached;
  }

  if (cachedTipId > currentTipId) {
    if (cached.length >= current.length) return cached;
    if (!cached[0]) return current;
    return [cached[0], ...current.slice(1)];
  }

  if (!current[0]) return cached;
  if (current.length >= cached.length) return current;
  return [current[0], ...cached.slice(1)];
}
