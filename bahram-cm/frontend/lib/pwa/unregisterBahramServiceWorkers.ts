const BAHRAM_CACHE_PREFIX = 'bahram-';

function isBahramServiceWorkerScript(url: string): boolean {
  return url.includes('sw-site') || url.includes('sw-panel') || url.includes('sw-family');
}

function isSiteServiceWorkerScript(url: string): boolean {
  return url.includes('sw-site');
}

async function unregisterMatchingServiceWorkers(
  matches: (scriptUrl: string) => boolean,
  cachePrefixes: string[],
): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations
      .filter((registration) => {
        const scripts = [registration.active, registration.waiting, registration.installing]
          .filter(Boolean)
          .map((worker) => worker!.scriptURL);

        return scripts.some(matches);
      })
      .map((registration) => registration.unregister()),
  );

  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => cachePrefixes.some((prefix) => key.startsWith(prefix)))
        .map((key) => caches.delete(key)),
    );
  }
}

/** Remove the site PWA worker (scope `/`) from admin/panel shells. */
export async function unregisterSiteServiceWorker(): Promise<void> {
  await unregisterMatchingServiceWorkers(isSiteServiceWorkerScript, [`${BAHRAM_CACHE_PREFIX}site-`]);
}

/** Remove all Bahram PWA workers — use in local dev only. */
export async function unregisterBahramServiceWorkers(): Promise<void> {
  await unregisterMatchingServiceWorkers(isBahramServiceWorkerScript, [BAHRAM_CACHE_PREFIX]);
}

/**
 * Runs before Next.js client chunks load — prevents stale SW from breaking Turbopack dev.
 * Keep this script tiny and dependency-free.
 */
export const DEV_SERVICE_WORKER_CLEANUP_SCRIPT = `(function(){if(!('serviceWorker'in navigator))return;navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(x){x.unregister()})});if('caches'in window){caches.keys().then(function(k){k.forEach(function(x){if(x.indexOf('bahram-')===0)caches.delete(x)})})}})();`;
