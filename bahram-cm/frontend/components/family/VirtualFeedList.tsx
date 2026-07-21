'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { measureElement as defaultMeasureElement, useVirtualizer } from '@tanstack/react-virtual';

export type VirtualFeedListHandle = {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  measure: () => void;
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
  const virtualizer = useVirtualizer({
    count,
    gap,
    anchorTo,
    followOnAppend,
    getScrollElement,
    getItemKey: (index) => items[index]?.key ?? String(index),
    estimateSize: (index) => estimateSize(index, items[index]!),
    overscan,
    useAnimationFrameWithResizeObserver: true,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? defaultMeasureElement
        : undefined,
  });

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
    }),
    [virtualizer],
  );

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

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
      return;
    }

    const appended = count > prev.count && first === prev.first;
    if (!appended) return;

    // New tip row: re-measure visible DOM after layout without wiping the full cache.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const root = containerRef.current;
        if (!root) return;
        virtualizer.getVirtualItems().forEach((row) => {
          const node = root.querySelector<HTMLElement>(`[data-index="${row.index}"]`);
          if (node) virtualizer.measureElement(node);
        });
      });
    });
  }, [count, items, virtualizer]);

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
