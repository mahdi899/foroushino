'use client';

import { useLayoutEffect } from 'react';

async function unregisterFamilyServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter(
        (registration) =>
          registration.scope.includes('/family') ||
          registration.active?.scriptURL.includes('sw-family'),
      )
      .map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bahram-family')).map((key) => caches.delete(key)));
  }
}

/** Registers `/sw-family.js` with scope `/family/` in production builds. */
export function FamilyServiceWorkerRegistrar() {
  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterFamilyServiceWorkers();
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw-family.js', { scope: '/family/' }).catch(() => {
      /* PWA is optional */
    });
  }, []);

  return null;
}
