/** Shared SWR defaults — keep family channel gentle on the API. */
export const familySwrDefaults = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 10_000,
} as const;

/** Feed: restore from SSR/IndexedDB; network only when revision/tip diverges. */
export const familyFeedSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  revalidateFirstPage: false,
  revalidateAll: false,
  revalidateIfStale: false,
  dedupingInterval: 15_000,
} as const;

export const familyPinnedSwr = {
  ...familySwrDefaults,
  dedupingInterval: 5 * 60_000,
  revalidateIfStale: false,
} as const;

export const familyBrandingSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  dedupingInterval: 60_000,
  keepPreviousData: true,
} as const;
