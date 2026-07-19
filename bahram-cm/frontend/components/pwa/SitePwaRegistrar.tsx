'use client';

import { useEffect } from 'react';
import { unregisterBahramServiceWorkers } from '@/lib/pwa/unregisterBahramServiceWorkers';

const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim() || '';

/** Registers `/sw-site.js` for the main marketing site (rostami.app) only. */
export function SitePwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterBahramServiceWorkers();
      return;
    }

    if (FAMILY_DOMAIN && window.location.hostname === FAMILY_DOMAIN) {
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw-site.js', { scope: '/' }).catch(() => {
      /* PWA is optional */
    });
  }, []);

  return null;
}
