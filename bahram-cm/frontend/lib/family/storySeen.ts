const STORAGE_KEY = 'family-stories-seen-id';
export const FAMILY_STORIES_SEEN_EVENT = 'family-stories-seen';

export function getSeenStoryId(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

export function markStoriesSeen(latestStoryId: number): void {
  if (typeof window === 'undefined' || latestStoryId <= 0) return;

  const current = getSeenStoryId();
  if (latestStoryId <= current) return;

  try {
    localStorage.setItem(STORAGE_KEY, String(latestStoryId));
    window.dispatchEvent(new CustomEvent(FAMILY_STORIES_SEEN_EVENT));
  } catch {
    /* ignore */
  }
}

export function hasUnseenStories(
  hasActiveStories: boolean | undefined,
  latestStoryId: number | null | undefined,
): boolean {
  if (!hasActiveStories || !latestStoryId) return false;
  return latestStoryId > getSeenStoryId();
}
