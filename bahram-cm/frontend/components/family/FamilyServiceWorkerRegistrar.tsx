'use client';

import { useLayoutEffect } from 'react';

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

// Option B dual-domain: on rostami.club (apex), the family app is served at
// `/`, so the service worker scope must be `/`. On the legacy single-domain
// path (`rostami.app/family`, or local dev), scope stays `/family/`.
const FAMILY_DOMAIN = process.env.NEXT_PUBLIC_FAMILY_DOMAIN?.trim().toLowerCase() || '';

function familyServiceWorkerScope(): string {
  if (
    FAMILY_DOMAIN &&
    typeof window !== 'undefined' &&
    window.location.hostname.toLowerCase() === FAMILY_DOMAIN
  ) {
    return '/';
  }
  return '/family/';
}

/** Registers `/sw-family.js` with the correct scope for the current host. */
export function FamilyServiceWorkerRegistrar() {
  useLayoutEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void unregisterFamilyServiceWorkers();
      return;
    }

    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker
      .register('/sw-family.js', { scope: familyServiceWorkerScope() })
      .catch((error) => {
        console.warn('[family-pwa] service worker registration failed', error);
      });
  }, []);

  return null;
}
