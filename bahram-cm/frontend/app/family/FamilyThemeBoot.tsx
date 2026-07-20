'use client';

import { useLayoutEffect } from 'react';
import { bootstrapSiteTheme } from '@/lib/site-theme';

/** Syncs family root + html theme after SSR (stored preference or OS default). */
export function FamilyThemeBoot() {
  useLayoutEffect(() => {
    const cleanup = bootstrapSiteTheme();
    document.documentElement.setAttribute('data-theme-ready', '1');
    return cleanup;
  }, []);

  return null;
}
