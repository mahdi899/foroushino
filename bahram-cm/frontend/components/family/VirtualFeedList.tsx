'use client';

import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

type VirtualFeedListProps<T> = {
  items: T[];
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number, item: T) => number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Variable-height virtualizer for the family feed. Keeps ~viewport+overscan
 * DOM nodes regardless of how many posts are loaded in SWR.
 */
export function VirtualFeedList<T>({
  items,
  getScrollElement,
  estimateSize,
  renderItem,
  overscan = 6,
  className,
  style,
}: VirtualFeedListProps<T>) {
  const count = items.length;
  const virtualizer = useVirtualizer({
    count,
    getScrollElement,
    estimateSize: (index) => estimateSize(index, items[index]!),
    overscan,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (el) => el.getBoundingClientRect().height
        : undefined,
  });

  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  // Re-measure when item count changes (jump / load newer / load older).
  const prevCount = useRef(count);
  useEffect(() => {
    if (prevCount.current !== count) {
      prevCount.current = count;
      virtualizer.measure();
    }
  }, [count, virtualizer]);

  return (
    <div className={className} style={{ ...style, height: totalSize, width: '100%', position: 'relative' }}>
      {virtualItems.map((virtualRow) => {
        const item = items[virtualRow.index];
        if (item == null) return null;
        return (
          <div
            key={virtualRow.key}
            data-index={virtualRow.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
            }}
          >
            {renderItem(item, virtualRow.index)}
          </div>
        );
      })}
    </div>
  );
}
