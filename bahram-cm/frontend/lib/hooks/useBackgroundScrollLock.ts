'use client';

import { useEffect, type RefObject } from 'react';

type BackgroundScrollLockOptions = {
  /** When false, touchmove on the document is blocked unless it originates inside this node. */
  allowTouchInsideRef?: RefObject<HTMLElement | null>;
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
}

/**
 * Freeze the page behind a mobile keyboard overlay:
 * - pin `body` with `position: fixed` (iOS-safe)
 * - lock `html` overflow
 * - freeze `#family-root` height so `100dvh` shrink from the keyboard does not reflow the feed
 * - lock `.family-feed-scroll` and restore its scrollTop
 * - optionally block touchmove outside an allow-list node
 */
export function useBackgroundScrollLock(
  enabled: boolean,
  options: BackgroundScrollLockOptions = {},
) {
  const { allowTouchInsideRef } = options;

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') return;

    const body = document.body;
    const root = document.documentElement;
    const familyRoot = document.getElementById('family-root');
    const windowScrollY = window.scrollY;

    const scrollTargets = Array.from(
      document.querySelectorAll<HTMLElement>('.family-feed-scroll'),
    ).filter((el) => {
      // Never freeze the overlay's own scroll areas (e.g. comments list).
      if (el.classList.contains('family-comments-list')) return false;
      const allow = allowTouchInsideRef?.current;
      return !(allow && allow.contains(el));
    });

    const bodyPrev = snapshotStyles(body);
    const rootOverflow = root.style.overflow;
    const familyPrev = familyRoot ? snapshotStyles(familyRoot) : null;
    const feedSnapshots = scrollTargets.map((el) => ({
      el,
      overflow: el.style.overflow,
      scrollTop: el.scrollTop,
    }));

    body.style.position = 'fixed';
    body.style.top = `-${windowScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
    root.style.overflow = 'hidden';

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

    const blockTouch = (event: TouchEvent) => {
      const allow = allowTouchInsideRef?.current;
      if (allow?.contains(event.target as Node)) return;
      event.preventDefault();
    };
    document.addEventListener('touchmove', blockTouch, { passive: false });

    return () => {
      restoreStyles(body, bodyPrev);
      root.style.overflow = rootOverflow;
      if (familyRoot && familyPrev) restoreStyles(familyRoot, familyPrev);

      for (const { el, overflow, scrollTop } of feedSnapshots) {
        el.style.overflow = overflow;
        el.scrollTop = scrollTop;
      }

      document.removeEventListener('touchmove', blockTouch);
      window.scrollTo(0, windowScrollY);
    };
  }, [allowTouchInsideRef, enabled]);
}
