const CACHE = 'bahram-site-v1';
const PRECACHE = ['/site-manifest.webmanifest', '/pwa/icon/192', '/pwa/icon/512', '/apple-icon'];

function isSiteScope(url) {
  if (
    url.pathname.startsWith('/panel') ||
    url.pathname.startsWith('/family') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/sso') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api/')
  ) {
    return false;
  }
  return true;
}

function isNextRuntimeRequest(url) {
  return (
    url.pathname.startsWith('/_next/') ||
    url.search.includes('_rsc') ||
    url.search.includes('_nextData')
  );
}

function isStaticSiteAsset(url) {
  return (
    url.pathname === '/site-manifest.webmanifest' ||
    url.pathname.startsWith('/pwa/icon/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/storage/media/') ||
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
        Promise.all(
          keys
            .filter((key) => key.startsWith('bahram-site-') && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (!isSiteScope(url) || isNextRuntimeRequest(url)) return;

  if (isStaticSiteAsset(url)) {
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

  // Marketing pages: network-first so deploys are not stuck behind SW cache.
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request).then((c) => c || caches.match('/'))),
  );
});
