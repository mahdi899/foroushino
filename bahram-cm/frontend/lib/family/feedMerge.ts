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
