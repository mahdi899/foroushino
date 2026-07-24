'use client';

import { useEffect } from 'react';
import { bootstrapFamilyPwaInstall } from '@/lib/family/pwa-install';
import { enableFamilyDailyPush, isFamilyPwaStandalone } from '@/lib/family/pwa-push';

/**
 * Boots PWA install listeners as early as possible in the family shell.
 * Also silently re-syncs Web Push subscription when permission is already granted.
 */
export function FamilyPwaInstallBoot() {
  useEffect(() => {
    bootstrapFamilyPwaInstall();

    if (!isFamilyPwaStandalone()) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const timer = window.setTimeout(() => {
      void enableFamilyDailyPush();
    }, 4000);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}
