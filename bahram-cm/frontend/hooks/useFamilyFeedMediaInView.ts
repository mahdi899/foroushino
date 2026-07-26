'use client';

import type { RefObject } from 'react';
import { useMemo } from 'react';
import { familyFeedMediaRootMargin } from '@/lib/family/feedUx';
import { useLazyInViewOnce } from '@/hooks/useLazyInViewOnce';

/** Family feed media: load once when near the viewport (large headroom). */
export function useFamilyFeedMediaInView<T extends Element>(
  ref: RefObject<T | null>,
  enabled = true,
): boolean {
  const rootMargin = useMemo(
    () => familyFeedMediaRootMargin(typeof window !== 'undefined' ? window.innerHeight : 800),
    [],
  );
  return useLazyInViewOnce(ref, enabled, rootMargin);
}
