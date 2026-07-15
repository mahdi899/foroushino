/** Shared SWR defaults — keep family channel gentle on the API. */
export const familySwrDefaults = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60_000,
} as const;

export const familyPinnedSwr = {
  ...familySwrDefaults,
  dedupingInterval: 5 * 60_000,
  revalidateIfStale: false,
} as const;

export const familyBrandingSwr = {
  ...familySwrDefaults,
  dedupingInterval: 10 * 60_000,
} as const;
