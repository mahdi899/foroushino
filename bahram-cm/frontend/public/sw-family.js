const CACHE = 'bahram-family-v1';
const PRECACHE = ['/family-manifest.webmanifest', '/icon', '/apple-icon'];

function isFamilyScope(url) {
  return url.pathname === '/family' || url.pathname.startsWith('/family/');
}

function isNextRuntimeRequest(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.search.includes('_rsc') ||
    url.search.includes('_nextData')
  );
}

function isApiRequest(url) {
  return url.pathname.startsWith('/api/');
}

function isStaticFamilyAsset(url) {
  return (
    url.pathname === '/family-manifest.webmanifest' ||
    url.pathname.startsWith('/storage/media/') ||
    url.pathname.startsWith('/storage/family/') ||
    /\.(?:svg|png|webp|ico|woff2?|jpg|jpeg)$/i.test(url.pathname)
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
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE && key.startsWith('bahram-family')).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (isNextRuntimeRequest(url) || isApiRequest(url)) return;

  if (isStaticFamilyAsset(url)) {
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

  if (isFamilyScope(url)) {
    // App shell: network-first so releases aren't stuck behind SW.
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((c) => c || caches.match('/family'))),
    );
  }
});
