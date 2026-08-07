'use client';

import { useLayoutEffect } from 'react';
import { isFamilyHost } from '@/lib/domains';
import {
  unregisterBahramServiceWorkers,
  unregisterSiteServiceWorker,
} from '@/lib/pwa/unregisterBahramServiceWorkers';

/** Unregister stale PWA workers in local dev (avoids Turbopack chunk errors). */
export function DevServiceWorkerCleanup() {
  useLayoutEffect(() => {
    if (isFamilyHost(window.location.hostname)) {
      void unregisterSiteServiceWorker();
      return;
    }
    void unregisterBahramServiceWorkers();
  }, []);

  return null;
}
