const CACHE = 'family-media-shell-v1';

function isMediaRequest(url) {
  return (
    url.pathname.startsWith('/storage/media/') ||
    url.pathname.startsWith('/storage/family/') ||
    url.pathname.startsWith('/cdn/media/')
  );
}

function isFamilyAppShell(url) {
  return url.pathname.startsWith('/family');
}

function isNextRuntimeRequest(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.search.includes('_rsc') ||
    url.search.includes('_nextData')
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (isNextRuntimeRequest(url)) return;

  if (isMediaRequest(url)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(event.request);
        if (cached) return cached;

        const response = await fetch(event.request);
        if (response && response.ok) {
          void cache.put(event.request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  if (isFamilyAppShell(url) && url.pathname.endsWith('.webp')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || !response.ok) return response;
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        });
      }),
    );
  }
});
