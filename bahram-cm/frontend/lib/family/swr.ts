/** Shared SWR defaults — aligned with backend family.cache unread_ttl (45s). */
export const familySwrDefaults = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 45_000,
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
  dedupingInterval: 60_000,
  revalidateIfStale: false,
} as const;

export const familyBrandingSwr = {
  ...familySwrDefaults,
  revalidateOnFocus: false,
  revalidateOnMount: false,
  dedupingInterval: 300_000,
  keepPreviousData: true,
} as const;
