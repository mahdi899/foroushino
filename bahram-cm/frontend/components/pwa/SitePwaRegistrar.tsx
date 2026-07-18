'use client';

import { useEffect } from 'react';

const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim() || '';

async function unregisterSiteServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const scripts = [registration.active, registration.waiting, registration.installing]
          .filter(Boolean)
          .map((worker) => worker!.scriptURL);
        return scripts.some((url) => url.includes('sw-site'));
      })
      .map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bahram-site-')).map((key) => caches.delete(key)));
  }
}

/** Registers `/sw-site.js` for the main marketing site (rostami.app) only. */
export function SitePwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterSiteServiceWorkers();
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
