'use client';

import { useLayoutEffect } from 'react';
import { applyResolvedTheme, readResolvedTheme } from '@/lib/site-theme';

/** Syncs family root + html theme after SSR cookie bootstrap (same as panel). */
export function FamilyThemeBoot() {
  useLayoutEffect(() => {
    applyResolvedTheme(readResolvedTheme());
    document.documentElement.setAttribute('data-theme-ready', '1');
  }, []);

  return null;
}
