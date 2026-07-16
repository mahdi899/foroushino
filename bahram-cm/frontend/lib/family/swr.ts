/** Shared SWR defaults — keep family channel gentle on the API. */
export const familySwrDefaults = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5_000,
} as const;

/** Feed: show IndexedDB cache instantly; only refresh the tip page in the background. */
export const familyFeedSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  revalidateFirstPage: true,
  revalidateAll: false,
  dedupingInterval: 30_000,
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
  dedupingInterval: 10 * 60_000,
  keepPreviousData: true,
} as const;
