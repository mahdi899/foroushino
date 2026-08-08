/** HTTP safety-net poll cadence for Club (feed tip, unread, notifications, …). */
export const FAMILY_REFRESH_INTERVAL_MS = 30_000;

/** Shared SWR defaults — dedupe window matches refresh cadence. */
export const familySwrDefaults = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: FAMILY_REFRESH_INTERVAL_MS,
} as const;

/** Feed: restore from SSR/IndexedDB; network only when revision/tip diverges. */
export const familyFeedSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  revalidateFirstPage: false,
  revalidateAll: false,
  revalidateIfStale: false,
  dedupingInterval: FAMILY_REFRESH_INTERVAL_MS,
} as const;

export const familyPinnedSwr = {
  ...familySwrDefaults,
  dedupingInterval: FAMILY_REFRESH_INTERVAL_MS,
  revalidateIfStale: false,
} as const;

export const familyBrandingSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  dedupingInterval: FAMILY_REFRESH_INTERVAL_MS,
  keepPreviousData: true,
} as const;
