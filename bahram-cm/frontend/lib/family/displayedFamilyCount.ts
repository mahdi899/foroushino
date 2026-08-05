const REFRESH_MS = 10 * 60 * 1000;

/** Logarithmic growth curve: early boost, eases toward real count at 1000+. */
export function getDisplayedFamilyCount(realCount: number): number {
  const count = Math.max(0, Math.floor(realCount));

  if (count === 0) {
    return 0;
  }

  if (count >= 1000) {
    return count;
  }

  const ln = Math.log(count);
  const calculated =
    100 + 65.633131677 * ln + 9.359800729 * ln * ln;
  const rounded = Math.round(calculated / 10) * 10;

  return Math.min(990, Math.max(100, rounded));
}

type CacheEntry = { value: number; until: number };

const cache = new Map<number, CacheEntry>();

/** Client-side cache: same real count reuses result for 10 minutes. */
export function getCachedDisplayedFamilyCount(realCount: number, now = Date.now()): number {
  const key = Math.max(0, Math.floor(realCount));
  const hit = cache.get(key);
  if (hit && hit.until > now) {
    return hit.value;
  }

  const value = getDisplayedFamilyCount(key);
  cache.set(key, { value, until: now + REFRESH_MS });
  return value;
}

export function displayedFamilyCountRefreshMs(): number {
  return REFRESH_MS;
}
