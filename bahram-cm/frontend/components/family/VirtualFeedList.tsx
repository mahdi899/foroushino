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
  /** Cheap pass over rows still sitting on an estimate — safe during scroll. */
  measureNewRows: () => void;
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
    // FeedView owns tip-following; default off so measurement alone cannot yank scroll.
    followOnAppend = false,
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

  // Default TanStack behavior still corrects during some mobile fling edges.
  // Skip size→scrollTop writes while the user is actively scrolling so upward
  // fling does not stutter when estimate→measure or media RO fires.
  useLayoutEffect(() => {
    virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) => {
      if (instance.isScrolling) return false;
      // Scrolling toward older history (list start) — never yank the viewport.
      if (instance.scrollDirection === 'backward') return false;
      return item.start < instance.getScrollOffset();
    };
  }, [virtualizer]);

  /**
   * `measureElement` reads offsetHeight and may immediately write scrollTop, so a
   * full sweep is an interleaved read/write storm and every non-zero delta above the
   * viewport becomes another scroll adjustment. Rows already in the size cache are
   * kept by their own ResizeObserver (registered via the `measureElement` ref), so
   * only rows still sitting on an estimate need an explicit pass.
   */
  const measureUnmeasuredRows = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-index]').forEach((node) => {
      const index = Number(node.dataset.index);
      if (!Number.isInteger(index)) return;
      const key = itemsRef.current[index]?.key;
      if (key != null && virtualizer.itemSizeCache.has(key)) return;
      virtualizer.measureElement(node);
    });
  }, [virtualizer]);

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
      measureNewRows: measureUnmeasuredRows,
    }),
    [virtualizer, remasureVisible, measureUnmeasuredRows],
  );

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Newly mounted rows only — closes estimate gaps without touching settled rows.
  useLayoutEffect(() => {
    measureUnmeasuredRows();
  }, [count, measureUnmeasuredRows]);

  // Fonts change every row's text height, so this one full sweep is worth it — but
  // only once per mount, never per count change.
  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (!cancelled) remasureVisible();
    };
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      void document.fonts.ready.then(run);
    }
    return () => {
      cancelled = true;
    };
  }, [remasureVisible]);

  // Keep measured sizes across prepend/append. Wiping the cache with measure()
  // forced every row back to rough estimates and created empty gaps + scroll jumps
  // on mobile while history loaded above the viewport.
  const edgeKeysRef = useRef({ first: '', last: '', count: 0 });
  useEffect(() => {
    const first = items[0]?.key ?? '';
    const last = items[count - 1]?.key ?? '';
    const prev = edgeKeysRef.current;
    const reordered =
      count === prev.count && count > 0 && (first !== prev.first || last !== prev.last);
    edgeKeysRef.current = { first, last, count };

    if (reordered) {
      // Keys moved without a net insert — safest to rebuild.
      virtualizer.measure();
      requestAnimationFrame(() => remasureVisible());
    }
    // Plain prepend/append needs nothing: `anchorTo: 'end'` re-anchors the viewport
    // and each row's ResizeObserver reports its real size on mount.
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
