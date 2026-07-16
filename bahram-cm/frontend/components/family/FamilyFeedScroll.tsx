'use client';

import { forwardRef, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import {
  getFeedDistanceFromBottom,
  restoreFeedScrollPosition,
  scrollFeedTo,
  scrollFeedToLatest,
  type FamilyFeedScrollBehavior,
  type FeedScrollRestoreSnapshot,
} from '@/lib/family/feedScroll';

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
};

/**
 * Native scroll container for the family feed — Telegram-like instant wheel/touch
 * response without Lenis interpolation overhead on long virtualized lists.
 */
export const FamilyFeedScroll = forwardRef<FamilyFeedScrollHandle, FamilyFeedScrollProps>(
  function FamilyFeedScroll({ children, className, style, onScroll }, ref) {
    const nativeRef = useRef<HTMLDivElement>(null);

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

    return (
      <div
        ref={nativeRef}
        className={cn(
          'family-feed-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain [overflow-anchor:none]',
          className,
        )}
        style={style}
        onScroll={onScroll}
      >
        {children}
      </div>
    );
  },
);
