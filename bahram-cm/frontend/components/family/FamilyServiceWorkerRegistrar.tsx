'use client';

import { useEffect } from 'react';

/** Cache-first for family media URLs; does not cache authenticated API JSON. */
export function FamilyServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.register('/sw-family.js', { scope: '/' }).catch(() => {
      /* optional enhancement */
    });
  }, []);

  return null;
}
