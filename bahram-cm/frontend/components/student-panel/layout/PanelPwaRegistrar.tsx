'use client';

import { useEffect } from 'react';

async function unregisterPanelServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => registration.scope.includes('/panel'))
      .map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bahram-panel-')).map((key) => caches.delete(key)));
  }
}

export function PanelPwaRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterPanelServiceWorkers();
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw-panel.js', { scope: '/panel/' }).catch(() => {
      // PWA is optional — ignore registration failures in unsupported browsers.
    });
  }, []);

  return null;
}
