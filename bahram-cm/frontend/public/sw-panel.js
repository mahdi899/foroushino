const CACHE = 'bahram-panel-v2';
const PRECACHE = ['/panel-manifest.webmanifest', '/favicon.svg', '/apple-touch-icon.svg'];

function isPanelScope(url) {
  return url.pathname.startsWith('/panel');
}

function isNextRuntimeRequest(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.search.includes('_rsc') ||
    url.search.includes('_nextData')
  );
}

function isStaticPanelAsset(url) {
  return (
    url.pathname === '/panel-manifest.webmanifest' ||
    /\.(?:svg|png|webp|ico|woff2?)$/i.test(url.pathname)
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
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
  if (!isPanelScope(url) || isNextRuntimeRequest(url)) return;

  if (isStaticPanelAsset(url)) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (!response || response.status !== 200) return response;
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        });
      }),
    );
    return;
  }

  // Panel pages and API calls: always prefer network to avoid stale Next.js chunks.
  event.respondWith(fetch(event.request));
});
