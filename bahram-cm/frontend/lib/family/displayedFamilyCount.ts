/** Client cache TTL — recompute at most once per tab every 10 minutes. */
export const DISPLAYED_FAMILY_COUNT_CACHE_MS = 10 * 60 * 1000;

type DisplayedFamilyCountCache = {
  realCount: number;
  value: number;
  expiresAt: number;
};

let displayedFamilyCountCache: DisplayedFamilyCountCache | null = null;

/** Test-only: clear in-memory cache between cases. */
export function resetDisplayedFamilyCountCache(): void {
  displayedFamilyCountCache = null;
}

/**
 * Public-facing member count: real + bonus (bonus shrinks as members grow).
 * O(1), no log/pow/random — same output everywhere when inputs match.
 */
export function getDisplayedFamilyCount(realCount: number): number {
  const count = Math.max(0, Math.floor(realCount));

  if (count === 0) {
    return 0;
  }

  if (count >= 1000) {
    return count;
  }

  const bonus =
    count < 10
      ? 100 - count
      : count < 100
        ? 500 - count
        : Math.max(0, 550 - Math.floor(count / 2));

  const raw = count + bonus;
  const rounded = Math.round(raw / 10) * 10;

  return Math.min(990, Math.max(100, rounded));
}

/** Same formula, but memoized per real count for ~10 minutes in the browser tab. */
export function getCachedDisplayedFamilyCount(
  realCount: number,
  now = Date.now(),
): number {
  const count = Math.max(0, Math.floor(realCount));

  if (
    displayedFamilyCountCache &&
    displayedFamilyCountCache.realCount === count &&
    now < displayedFamilyCountCache.expiresAt
  ) {
    return displayedFamilyCountCache.value;
  }

  const value = getDisplayedFamilyCount(count);
  displayedFamilyCountCache = {
    realCount: count,
    value,
    expiresAt: now + DISPLAYED_FAMILY_COUNT_CACHE_MS,
  };

  return value;
}
