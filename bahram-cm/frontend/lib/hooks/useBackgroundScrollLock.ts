'use client';

import { useEffect, type RefObject } from 'react';

type BackgroundScrollLockOptions = {
  /** When false, touchmove on the document is blocked unless it originates inside this node. */
  allowTouchInsideRef?: RefObject<HTMLElement | null>;
  /**
   * `fixed` — pin `body` (iOS-safe for family feed / keyboard). Can shift sticky site chrome.
   * `overflow` — only lock overflow + gestures; keeps the page layout/scroll position untouched.
   */
  strategy?: 'fixed' | 'overflow';
};

type StyleSnapshot = {
  position: string;
  top: string;
  left: string;
  right: string;
  width: string;
  overflow: string;
  height: string;
  minHeight: string;
  paddingRight: string;
};

function snapshotStyles(el: HTMLElement): StyleSnapshot {
  return {
    position: el.style.position,
    top: el.style.top,
    left: el.style.left,
    right: el.style.right,
    width: el.style.width,
    overflow: el.style.overflow,
    height: el.style.height,
    minHeight: el.style.minHeight,
    paddingRight: el.style.paddingRight,
  };
}

function restoreStyles(el: HTMLElement, prev: StyleSnapshot) {
  el.style.position = prev.position;
  el.style.top = prev.top;
  el.style.left = prev.left;
  el.style.right = prev.right;
  el.style.width = prev.width;
  el.style.overflow = prev.overflow;
  el.style.height = prev.height;
  el.style.minHeight = prev.minHeight;
  el.style.paddingRight = prev.paddingRight;
}

/**
 * Freeze the page behind an overlay.
 * Prefer `strategy: 'overflow'` on the public site so sticky headers stay put.
 */
export function useBackgroundScrollLock(
  enabled: boolean,
  options: BackgroundScrollLockOptions = {},
) {
  const { allowTouchInsideRef, strategy = 'fixed' } = options;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const body = document.body;
    const root = document.documentElement;
    const familyRoot = document.getElementById('family-root');
    const windowScrollY = window.scrollY;
    const scrollbarGap = Math.max(0, window.innerWidth - root.clientWidth);

    const scrollTargets = Array.from(
      document.querySelectorAll<HTMLElement>('.family-feed-scroll'),
    ).filter((el) => {
      // Never freeze the overlay's own scroll areas (e.g. comments list).
      if (el.classList.contains('family-comments-list')) return false;
      const allow = allowTouchInsideRef?.current;
      return !(allow && allow.contains(el));
    });

    const bodyPrev = snapshotStyles(body);
    const rootPrev = snapshotStyles(root);
    const familyPrev = familyRoot ? snapshotStyles(familyRoot) : null;
    const feedSnapshots = scrollTargets.map((el) => ({
      el,
      overflow: el.style.overflow,
      scrollTop: el.scrollTop,
    }));

    if (strategy === 'overflow') {
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      if (scrollbarGap > 0) {
        // Keep layout width stable when the scrollbar disappears.
        root.style.paddingRight = rootPrev.paddingRight || `${scrollbarGap}px`;
      }
    } else {
      body.style.position = 'fixed';
      body.style.top = `-${windowScrollY}px`;
      body.style.left = '0';
      body.style.right = '0';
      body.style.width = '100%';
      body.style.overflow = 'hidden';
      root.style.overflow = 'hidden';
      if (scrollbarGap > 0) {
        body.style.paddingRight = bodyPrev.paddingRight || `${scrollbarGap}px`;
      }

      if (familyRoot) {
        const frozenHeight = Math.round(familyRoot.getBoundingClientRect().height);
        if (frozenHeight > 0) {
          familyRoot.style.height = `${frozenHeight}px`;
          familyRoot.style.minHeight = `${frozenHeight}px`;
        }
        familyRoot.style.overflow = 'hidden';
      }

      for (const { el } of feedSnapshots) {
        el.style.overflow = 'hidden';
      }
    }

    const allowEvent = (target: EventTarget | null) => {
      const allow = allowTouchInsideRef?.current;
      return Boolean(allow && target instanceof Node && allow.contains(target));
    };

    const blockTouch = (event: TouchEvent) => {
      if (allowEvent(event.target)) return;
      event.preventDefault();
    };
    const blockWheel = (event: WheelEvent) => {
      if (allowEvent(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener('touchmove', blockTouch, { passive: false });
    document.addEventListener('wheel', blockWheel, { passive: false });

    return () => {
      restoreStyles(body, bodyPrev);
      restoreStyles(root, rootPrev);
      if (familyRoot && familyPrev) restoreStyles(familyRoot, familyPrev);

      for (const { el, overflow, scrollTop } of feedSnapshots) {
        el.style.overflow = overflow;
        el.scrollTop = scrollTop;
      }

      document.removeEventListener('touchmove', blockTouch);
      document.removeEventListener('wheel', blockWheel);

      // Only the fixed strategy moves window scroll; overflow leaves it alone.
      if (strategy === 'fixed') {
        const html = document.documentElement;
        const prevBehavior = html.style.scrollBehavior;
        html.style.scrollBehavior = 'auto';
        window.scrollTo(0, windowScrollY);
        html.style.scrollBehavior = prevBehavior;
      }
    };
  }, [allowTouchInsideRef, enabled, strategy]);
}
