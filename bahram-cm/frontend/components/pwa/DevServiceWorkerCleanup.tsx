'use client';

import { useLayoutEffect } from 'react';
import { unregisterBahramServiceWorkers } from '@/lib/pwa/unregisterBahramServiceWorkers';

/** Unregister stale PWA workers in local dev (avoids Turbopack chunk errors). */
export function DevServiceWorkerCleanup() {
  useLayoutEffect(() => {
    void unregisterBahramServiceWorkers();
  }, []);

  return null;
}
