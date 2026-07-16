'use client';

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

export type VirtualFeedListHandle = {
  scrollToIndex: (index: number, options?: { align?: 'start' | 'center' | 'end' }) => void;
  measure: () => void;
};

type VirtualFeedListProps<T> = {
  items: T[];
  getScrollElement: () => HTMLElement | null;
  estimateSize: (index: number, item: T) => number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  gap?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Variable-height virtualizer for the family feed. Keeps ~viewport+overscan
 * DOM nodes regardless of how many posts are loaded in SWR.
 */
export const VirtualFeedList = forwardRef(function VirtualFeedList<T>(
  {
    items,
    getScrollElement,
    estimateSize,
    renderItem,
    overscan = 8,
    gap = 8,
    className,
    style,
  }: VirtualFeedListProps<T>,
  ref: React.ForwardedRef<VirtualFeedListHandle>,
) {
  const count = items.length;
  const virtualizer = useVirtualizer({
    count,
    gap,
    getScrollElement,
    estimateSize: (index) => estimateSize(index, items[index]!),
    overscan,
    measureElement:
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? (el) => el.getBoundingClientRect().height
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

  const prevCount = useRef(count);
  useEffect(() => {
    if (prevCount.current !== count) {
      prevCount.current = count;
      virtualizer.measure();
    }
  }, [count, virtualizer]);

  return (
    <div
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
}) as <T>(
  props: VirtualFeedListProps<T> & { ref?: React.ForwardedRef<VirtualFeedListHandle> },
) => React.ReactElement;
