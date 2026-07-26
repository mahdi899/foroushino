'use client';

import type { RefObject } from 'react';
import { FAMILY_FEED_MEDIA_ROOT_MARGIN } from '@/lib/family/feedUx';
import { useLazyInViewOnce } from '@/hooks/useLazyInViewOnce';

/** Family feed media: load once when near the viewport (large headroom). */
export function useFamilyFeedMediaInView<T extends Element>(
  ref: RefObject<T | null>,
  enabled = true,
): boolean {
  return useLazyInViewOnce(ref, enabled, FAMILY_FEED_MEDIA_ROOT_MARGIN);
}
