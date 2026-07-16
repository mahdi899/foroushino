'use client';

import { useEffect, useRef } from 'react';
import { familyFeedDebug, isFamilyFeedDebugEnabled } from '@/lib/family/feedDebug';

/** Counts commits for a named component when family debug is on. */
export function useFamilyDebugRender(name: string) {
  const countRef = useRef(0);
  countRef.current += 1;

  useEffect(() => {
    if (!isFamilyFeedDebugEnabled()) return;
    familyFeedDebug.trackRender(name);
  });
}
