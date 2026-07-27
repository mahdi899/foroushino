/**
 * Session-scoped registry of family media URLs that have already loaded
 * successfully. Survives virtualizer remounts so scroll-back does not
 * re-run IntersectionObserver / re-decode the same asset.
 */

const seenUrls = new Set<string>();

export function markFamilyMediaSeen(url: string | null | undefined): void {
  if (!url) return;
  seenUrls.add(url);
}

export function hasFamilyMediaBeenSeen(url: string | null | undefined): boolean {
  if (!url) return false;
  return seenUrls.has(url);
}

/** Test helper — clears the in-memory session set. */
export function clearFamilyMediaSeenForTests(): void {
  seenUrls.clear();
}
