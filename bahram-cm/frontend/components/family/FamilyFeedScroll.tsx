'use client';

import { forwardRef, useImperativeHandle, useRef, type CSSProperties, type ReactNode } from 'react';
import { ReactLenis, useLenis, type LenisRef } from 'lenis/react';
import { cn } from '@/lib/cn';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import {
  getFeedDistanceFromBottom,
  getLenisDistanceFromBottom,
  restoreFeedScrollPosition,
  scrollFeedTo,
  scrollFeedToLatest,
  type FamilyFeedScrollBehavior,
  type FeedScrollRestoreSnapshot,
} from '@/lib/family/feedScroll';

const FEED_LENIS_OPTIONS = {
  autoRaf: true,
  lerp: 0.1,
  smoothWheel: true,
  wheelMultiplier: 0.9,
  touchMultiplier: 1.05,
  syncTouch: true,
  syncTouchLerp: 0.1,
  overscroll: true,
  autoResize: true,
} as const;

export type FamilyFeedScrollHandle = {
  getScrollElement: () => HTMLElement | null;
  getLenis: () => LenisRef['lenis'] | undefined;
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

function FeedLenisScrollListener({ onScroll }: { onScroll: () => void }) {
  useLenis(onScroll);
  return null;
}

export const FamilyFeedScroll = forwardRef<FamilyFeedScrollHandle, FamilyFeedScrollProps>(
  function FamilyFeedScroll({ children, className, style, onScroll }, ref) {
    const lenisRef = useRef<LenisRef>(null);
    const nativeRef = useRef<HTMLDivElement>(null);
    const reduceMotion = usePrefersReducedMotion();

    useImperativeHandle(
      ref,
      () => ({
        getScrollElement: () => (reduceMotion ? nativeRef.current : lenisRef.current?.wrapper ?? null),
        getLenis: () => lenisRef.current?.lenis,
        getDistanceFromBottom: () => {
          const lenis = lenisRef.current?.lenis;
          if (lenis) return getLenisDistanceFromBottom(lenis);
          const root = reduceMotion ? nativeRef.current : lenisRef.current?.wrapper ?? null;
          return root ? getFeedDistanceFromBottom(root) : 0;
        },
        scrollTo: (top, behavior = 'smooth') => {
          scrollFeedTo(top, behavior, {
            root: reduceMotion ? nativeRef.current : lenisRef.current?.wrapper ?? null,
            lenis: reduceMotion ? null : lenisRef.current?.lenis,
          });
        },
        scrollToLatest: (behavior = 'auto') => {
          scrollFeedToLatest(behavior, {
            root: reduceMotion ? nativeRef.current : lenisRef.current?.wrapper ?? null,
            lenis: reduceMotion ? null : lenisRef.current?.lenis,
          });
        },
        restoreScrollPosition: (snapshot) => {
          restoreFeedScrollPosition(snapshot, {
            root: reduceMotion ? nativeRef.current : lenisRef.current?.wrapper ?? null,
            lenis: reduceMotion ? null : lenisRef.current?.lenis,
          });
        },
      }),
      [reduceMotion],
    );

    const baseClass = cn(
      'family-feed-scroll min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain [overflow-anchor:none]',
      reduceMotion ? 'overflow-y-auto' : 'overflow-y-hidden family-feed-scroll--lenis',
      className,
    );

    if (reduceMotion) {
      return (
        <div
          ref={nativeRef}
          className={baseClass}
          style={style}
          onScroll={onScroll}
        >
          {children}
        </div>
      );
    }

    return (
      <ReactLenis
        ref={lenisRef}
        root={false}
        options={FEED_LENIS_OPTIONS}
        className={baseClass}
        style={style}
      >
        {onScroll ? <FeedLenisScrollListener onScroll={onScroll} /> : null}
        {children}
      </ReactLenis>
    );
  },
);
