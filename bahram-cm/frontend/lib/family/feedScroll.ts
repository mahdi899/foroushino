import type Lenis from 'lenis';

export type FamilyFeedScrollBehavior = 'auto' | 'smooth';

/** Prefer anchor restore (stable with Lenis); delta is a fallback only. */
export type FeedScrollRestoreSnapshot =
  | { mode: 'anchor'; anchorId: string; offsetFromRootTop: number }
  | { mode: 'delta'; height: number; top: number };

export function getFeedDistanceFromBottom(root: HTMLElement) {
  return root.scrollHeight - root.clientHeight - root.scrollTop;
}

export function getLenisDistanceFromBottom(lenis: Lenis) {
  return Math.max(0, lenis.limit - lenis.scroll);
}

export function scrollFeedTo(
  targetTop: number,
  behavior: FamilyFeedScrollBehavior,
  {
    root,
    lenis,
  }: {
    root: HTMLElement | null;
    lenis?: Lenis | null;
  },
) {
  const top = Math.max(0, targetTop);

  if (lenis) {
    lenis.scrollTo(top, {
      immediate: behavior === 'auto',
      force: true,
      duration: behavior === 'smooth' ? 0.52 : 0,
      lerp: behavior === 'smooth' ? 0.11 : undefined,
    });
    return;
  }

  if (!root) return;

  if (behavior === 'smooth') {
    root.scrollTo({ top, behavior: 'smooth' });
    return;
  }

  root.scrollTop = top;
}

/** Scroll so `el` sits at the bottom of `root` (Telegram unread landing). */
export function scrollFeedToElement(
  el: HTMLElement,
  behavior: FamilyFeedScrollBehavior,
  {
    root,
    lenis,
    align = 'start',
    padding = 12,
  }: {
    root: HTMLElement;
    lenis?: Lenis | null;
    align?: 'start' | 'end';
    padding?: number;
  },
) {
  const rootRect = root.getBoundingClientRect();
  const elRect = el.getBoundingClientRect();
  const currentScroll = lenis ? lenis.scroll : root.scrollTop;
  const offset =
    align === 'end' ? root.clientHeight - elRect.height - padding : padding;
  const targetTop = elRect.top - rootRect.top + currentScroll - offset;
  scrollFeedTo(Math.max(0, targetTop), behavior, { root, lenis });
}

export function scrollFeedToLatest(
  behavior: FamilyFeedScrollBehavior,
  {
    root,
    lenis,
  }: {
    root: HTMLElement | null;
    lenis?: Lenis | null;
  },
) {
  if (lenis) {
    // Recalculate limit after layout/media so we don't stop mid-feed.
    lenis.resize();
    const limit = lenis.limit;
    lenis.scrollTo(limit, {
      immediate: behavior === 'auto',
      force: true,
      duration: behavior === 'smooth' ? 0.48 : 0,
      lerp: behavior === 'smooth' ? 0.11 : undefined,
    });
    return;
  }

  if (!root) return;

  if (behavior === 'smooth') {
    root.scrollTo({ top: root.scrollHeight, behavior: 'smooth' });
    return;
  }

  root.scrollTop = root.scrollHeight;
}

export function getFeedScrollTop(root: HTMLElement, lenis?: Lenis | null) {
  return lenis ? lenis.scroll : root.scrollTop;
}

/**
 * Snapshot the first in-viewport post so we can keep it pinned after older
 * posts are prepended (Lenis-safe — does not rely on wrapper.scrollTop).
 */
export function captureFeedScrollRestore(
  root: HTMLElement,
  lenis?: Lenis | null,
): FeedScrollRestoreSnapshot {
  const rootTop = root.getBoundingClientRect().top;
  const posts = root.querySelectorAll<HTMLElement>('[id^="family-post-"]');

  for (const el of posts) {
    const rect = el.getBoundingClientRect();
    // First post that still has any pixels below the top edge of the feed.
    if (rect.bottom > rootTop + 4 && el.id) {
      return {
        mode: 'anchor',
        anchorId: el.id,
        offsetFromRootTop: rect.top - rootTop,
      };
    }
  }

  return {
    mode: 'delta',
    height: root.scrollHeight,
    top: getFeedScrollTop(root, lenis),
  };
}

export function restoreFeedScrollPosition(
  previous: FeedScrollRestoreSnapshot,
  {
    root,
    lenis,
  }: {
    root: HTMLElement | null;
    lenis?: Lenis | null;
  },
) {
  if (!root) return;

  if (lenis) {
    lenis.resize();
  }

  if (previous.mode === 'anchor') {
    const el = document.getElementById(previous.anchorId);
    if (!el) return;

    const rootTop = root.getBoundingClientRect().top;
    const currentOffset = el.getBoundingClientRect().top - rootTop;
    const drift = currentOffset - previous.offsetFromRootTop;
    if (Math.abs(drift) < 0.5) return;

    const nextTop = getFeedScrollTop(root, lenis) + drift;
    scrollFeedTo(nextTop, 'auto', { root, lenis });
    return;
  }

  const delta = root.scrollHeight - previous.height;
  if (delta === 0) return;
  const nextTop = previous.top + delta;
  scrollFeedTo(nextTop, 'auto', { root, lenis });
}
