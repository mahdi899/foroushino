'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type CSSProperties,
  type KeyboardEventHandler,
  type ReactNode,
  type TouchEventHandler,
  type WheelEventHandler,
} from 'react';
import { cn } from '@/lib/cn';
import {
  getFeedDistanceFromBottom,
  restoreFeedScrollPosition,
  scrollFeedTo,
  scrollFeedToLatest,
  type FamilyFeedScrollBehavior,
  type FeedScrollRestoreSnapshot,
} from '@/lib/family/feedScroll';

/** Drop glass blur shortly after the last scroll pulse — keeps fling composited cheap. */
const SCROLL_GLASS_IDLE_MS = 140;

export type FamilyFeedScrollHandle = {
  getScrollElement: () => HTMLElement | null;
  getLenis: () => null;
  getDistanceFromBottom: () => number;
  scrollTo: (top: number, behavior?: FamilyFeedScrollBehavior) => void;
  scrollToLatest: (behavior?: FamilyFeedScrollBehavior) => void;
  restoreScrollPosition: (snapshot: FeedScrollRestoreSnapshot) => void;
};

type FamilyFeedScrollProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  onScroll?: () => void;
  onWheel?: WheelEventHandler<HTMLDivElement>;
  onTouchMove?: TouchEventHandler<HTMLDivElement>;
  onKeyDown?: KeyboardEventHandler<HTMLDivElement>;
};

/**
 * Native scroll container for the family feed — Telegram-like instant wheel/touch
 * response without Lenis interpolation overhead on long virtualized lists.
 */
export const FamilyFeedScroll = forwardRef<FamilyFeedScrollHandle, FamilyFeedScrollProps>(
  function FamilyFeedScroll(
    { children, className, style, onScroll, onWheel, onTouchMove, onKeyDown },
    ref,
  ) {
    const nativeRef = useRef<HTMLDivElement>(null);
    const scrollIdleTimerRef = useRef<number | null>(null);

    useEffect(() => {
      return () => {
        if (scrollIdleTimerRef.current != null) {
          window.clearTimeout(scrollIdleTimerRef.current);
        }
      };
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        getScrollElement: () => nativeRef.current,
        getLenis: () => null,
        getDistanceFromBottom: () => {
          const root = nativeRef.current;
          return root ? getFeedDistanceFromBottom(root) : 0;
        },
        scrollTo: (top, behavior = 'smooth') => {
          scrollFeedTo(top, behavior, { root: nativeRef.current, lenis: null });
        },
        scrollToLatest: (behavior = 'auto') => {
          scrollFeedToLatest(behavior, { root: nativeRef.current, lenis: null });
        },
        restoreScrollPosition: (snapshot) => {
          restoreFeedScrollPosition(snapshot, { root: nativeRef.current, lenis: null });
        },
      }),
      [],
    );

    const markScrolling = () => {
      const el = nativeRef.current;
      if (!el) return;
      el.classList.add('family-feed-scroll--scrolling');
      if (scrollIdleTimerRef.current != null) {
        window.clearTimeout(scrollIdleTimerRef.current);
      }
      scrollIdleTimerRef.current = window.setTimeout(() => {
        el.classList.remove('family-feed-scroll--scrolling');
        scrollIdleTimerRef.current = null;
      }, SCROLL_GLASS_IDLE_MS);
    };

    return (
      <div
        ref={nativeRef}
        className={cn(
          'family-feed-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]',
          className,
        )}
        style={style}
        onScroll={() => {
          markScrolling();
          onScroll?.();
        }}
        onWheel={onWheel}
        onTouchMove={onTouchMove}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    );
  },
);
