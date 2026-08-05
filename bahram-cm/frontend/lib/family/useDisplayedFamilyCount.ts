'use client';

import { useEffect, useState } from 'react';
import {
  DISPLAYED_FAMILY_COUNT_CACHE_MS,
  getCachedDisplayedFamilyCount,
} from '@/lib/family/displayedFamilyCount';

/** Cached display count for UI — refreshes at most every 10 minutes per tab. */
export function useDisplayedFamilyCount(memberCount?: number): number | null {
  const [display, setDisplay] = useState<number | null>(() =>
    typeof memberCount === 'number' ? getCachedDisplayedFamilyCount(memberCount) : null,
  );

  useEffect(() => {
    if (typeof memberCount !== 'number') {
      setDisplay(null);
      return;
    }

    setDisplay(getCachedDisplayedFamilyCount(memberCount));

    const id = window.setInterval(
      () => setDisplay(getCachedDisplayedFamilyCount(memberCount)),
      DISPLAYED_FAMILY_COUNT_CACHE_MS,
    );

    return () => window.clearInterval(id);
  }, [memberCount]);

  return display;
}
