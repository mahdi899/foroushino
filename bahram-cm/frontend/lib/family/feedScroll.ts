import type Lenis from 'lenis';

export type FamilyFeedScrollBehavior = 'auto' | 'smooth';

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
    lenis.scrollTo(lenis.limit, {
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

export function restoreFeedScrollPosition(
  previous: { height: number; top: number },
  {
    root,
    lenis,
  }: {
    root: HTMLElement | null;
    lenis?: Lenis | null;
  },
) {
  if (!root) return;

  const delta = root.scrollHeight - previous.height;
  const nextTop = previous.top + delta;

  if (lenis) {
    lenis.scrollTo(nextTop, { immediate: true, force: true });
    return;
  }

  root.scrollTop = nextTop;
}
