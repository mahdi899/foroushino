'use client';

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useEffect,
  useLayoutEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { measureElement as defaultMeasureElement, useVirtualizer } from '@tanstack/react-virtual';

export type VirtualFeedListHandle = {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  measure: () => void;
  /** Remeasure currently mounted rows without wiping the size cache. */
  remasureVisible: () => void;
};

type KeyedItem = { key: string };

type VirtualFeedListProps<T extends KeyedItem> = {
  items: T[];
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number, item: T) => number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  gap?: number;
  /** Keep scroll pinned to the feed tip when new rows append at the end. */
  anchorTo?: 'start' | 'end';
  followOnAppend?: boolean | 'auto' | 'smooth';
  className?: string;
  style?: CSSProperties;
};

/**
 * Variable-height virtualizer for the family feed. Keeps ~viewport+overscan
 * DOM nodes regardless of how many posts are loaded in SWR.
 */
export const VirtualFeedList = forwardRef(function VirtualFeedList<T extends KeyedItem>(
  {
    items,
    getScrollElement,
    estimateSize,
    renderItem,
    overscan = 8,
    gap = 8,
    anchorTo = 'end',
    followOnAppend = 'auto',
    className,
    style,
  }: VirtualFeedListProps<T>,
  ref: React.ForwardedRef<VirtualFeedListHandle>,
) {
  const count = items.length;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const virtualizer = useVirtualizer({
    count,
    gap,
    anchorTo,
    followOnAppend,
    getScrollElement,
    getItemKey: (index) => itemsRef.current[index]?.key ?? String(index),
    estimateSize: (index) => estimateSize(index, itemsRef.current[index]!),
    overscan,
    useAnimationFrameWithResizeObserver: true,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? defaultMeasureElement
        : undefined,
  });

  const remasureVisible = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-index]').forEach((node) => {
      virtualizer.measureElement(node);
    });
  }, [virtualizer]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToIndex: (index, options) => {
        virtualizer.scrollToIndex(index, {
          align: options?.align ?? 'start',
          behavior: 'auto',
        });
      },
      measure: () => {
        virtualizer.measure();
      },
      remasureVisible,
    }),
    [virtualizer, remasureVisible],
  );

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // First paint / remount: remasure mounted rows before the user sees estimate gaps.
  useLayoutEffect(() => {
    remasureVisible();
  }, [count, remasureVisible]);

  // After fonts settle (common remount flash) remasure without clearing cache.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) remasureVisible();
    };
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(run);
    }
    const t1 = window.setTimeout(run, 120);
    const t2 = window.setTimeout(run, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [count, remasureVisible]);

  // Only rebuild measurements when older rows prepend or order shifts — not when
  // a new post appends at the tip (wiping the cache caused visible gap jitter).
  const edgeKeysRef = useRef({ first: '', last: '', count: 0 });
  useEffect(() => {
    const first = items[0]?.key ?? '';
    const last = items[count - 1]?.key ?? '';
    const prev = edgeKeysRef.current;
    const prepended = count > prev.count && first !== prev.first;
    const reordered =
      count === prev.count && count > 0 && (first !== prev.first || last !== prev.last);
    edgeKeysRef.current = { first, last, count };

    if (prepended || reordered) {
      virtualizer.measure();
      requestAnimationFrame(() => remasureVisible());
      return;
    }

    const appended = count > prev.count && first === prev.first;
    if (!appended) return;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => remasureVisible());
    });
  }, [count, items, remasureVisible, virtualizer]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ ...style, height: totalSize, width: '100%', position: 'relative' }}
    >
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        if (item == null) return null;
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            className="family-feed-list__virtual-row"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translate3d(0, ${virtualRow.start}px, 0)`,
            }}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}) as <T extends KeyedItem>(
  props: VirtualFeedListProps<T> & { ref?: React.ForwardedRef<VirtualFeedListHandle> },
) => React.ReactElement;
