'use client';

import { useEffect } from 'react';
import { bootstrapFamilyPwaInstall } from '@/lib/family/pwa-install';

/**
 * Boots PWA install listeners as early as possible in the family shell.
 * Replaces the old floating FamilyInstallCard — banners live in the feed chrome.
 */
export function FamilyPwaInstallBoot() {
  useEffect(() => {
    bootstrapFamilyPwaInstall();
  }, []);

  return null;
}
