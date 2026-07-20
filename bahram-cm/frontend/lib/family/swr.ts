/** Shared SWR defaults — keep family channel gentle on the API. */
export const familySwrDefaults = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5_000,
} as const;

/** Feed: refresh tip on every visit; IndexedDB restores scroll depth only. */
export const familyFeedSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: true,
  revalidateOnMount: true,
  revalidateFirstPage: true,
  revalidateAll: false,
  dedupingInterval: 5_000,
} as const;

export const familyPinnedSwr = {
  ...familySwrDefaults,
  dedupingInterval: 5 * 60_000,
  revalidateIfStale: false,
} as const;

export const familyBrandingSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: true,
  revalidateOnMount: true,
  dedupingInterval: 30_000,
  keepPreviousData: true,
} as const;
