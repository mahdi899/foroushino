import type { FeedCachePage } from '@/lib/family/feedCache';

/**
 * Bound `useSWRInfinite` mutators for live family-feed caches.
 *
 * Soft patches must go through these — `globalMutate` on page keys does not update
 * the `$inf$` snapshot that FeedView reads, so UI stays stale until refresh.
 */
type FeedPagesUpdater = (
  pages: FeedCachePage[] | undefined,
) => FeedCachePage[] | undefined | Promise<FeedCachePage[] | undefined>;

type FeedPagesMutator = (
  updater: FeedPagesUpdater,
) => Promise<FeedCachePage[] | undefined | void>;

const mutators = new Set<FeedPagesMutator>();

export function registerFamilyFeedPagesMutator(mutate: FeedPagesMutator): () => void {
  mutators.add(mutate);
  return () => {
    mutators.delete(mutate);
  };
}

export function hasFamilyFeedPagesMutators(): boolean {
  return mutators.size > 0;
}

/** Apply an updater to every mounted family-feed infinite cache. */
export async function mutateFamilyFeedPages(updater: FeedPagesUpdater): Promise<boolean> {
  if (mutators.size === 0) return false;

  let changed = false;
  await Promise.all(
    [...mutators].map(async (mutate) => {
      await mutate(async (pages) => {
        const next = await updater(pages);
        if (next && next !== pages) changed = true;
        return next;
      });
    }),
  );
  return changed;
}
