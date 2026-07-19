'use client';

import { useLayoutEffect } from 'react';
import { unregisterSiteServiceWorker } from '@/lib/pwa/unregisterBahramServiceWorkers';

/** Admin never loads SitePwaRegistrar — drop stale site SW (scope `/`) here. */
export function BareShellServiceWorkerCleanup() {
  useLayoutEffect(() => {
    void unregisterSiteServiceWorker();
  }, []);

  return null;
}
