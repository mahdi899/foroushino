'use client';

import { useLayoutEffect } from 'react';
import { unregisterSiteServiceWorker } from '@/lib/pwa/unregisterBahramServiceWorkers';
import { isFamilyHost } from '@/lib/domains';
import {
  ensureFamilyServiceWorkerRegistered,
  familyServiceWorkerScope,
} from '@/lib/family/pwa-service-worker';

async function unregisterFamilyServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const scripts = [registration.active, registration.waiting, registration.installing]
          .filter(Boolean)
          .map((worker) => worker!.scriptURL);
        return scripts.some((url) => url.includes('sw-family')) || registration.scope.includes('/family');
      })
      .map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('bahram-family')).map((key) => caches.delete(key)));
  }
}

/** Registers `/sw-family.js` with the correct scope for the current host. */
export function FamilyServiceWorkerRegistrar() {
  useLayoutEffect(() => {
    const onFamilyHost = isFamilyHost(window.location.hostname);

    if (process.env.NODE_ENV !== 'production' && !onFamilyHost) {
      void unregisterFamilyServiceWorkers();
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    const scope = familyServiceWorkerScope();

    void (async () => {
      if (scope === '/') {
        await unregisterSiteServiceWorker();
      }

      await ensureFamilyServiceWorkerRegistered().catch((error) => {
        console.warn('[family-pwa] service worker registration failed', error);
      });
    })();
  }, []);

  return null;
}
