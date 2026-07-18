const CACHE = 'bahram-family-v3';
const PRECACHE = ['/family-manifest.webmanifest', '/icon', '/apple-icon'];

/**
 * Option B dual-domain:
 * - rostami.club apex → SW scope `/` → shell is `/`
 * - rostami.app/family (or local) → SW scope `/family/` → shell is `/family`
 */
function isApexFamilyScope() {
  try {
    const path = new URL(self.registration.scope).pathname;
    return path === '/' || path === '';
  } catch {
    return false;
  }
}

function shellFallback() {
  return isApexFamilyScope() ? '/' : '/family';
}

function isFamilyScope(url) {
  if (isApexFamilyScope()) {
    // Apex: treat same-origin navigations as the family app shell, except
    // paths that belong to the main site / tooling.
    if (
      url.pathname.startsWith('/panel') ||
      url.pathname.startsWith('/admin') ||
      url.pathname.startsWith('/sso') ||
      url.pathname.startsWith('/_next')
    ) {
      return false;
    }
    return true;
  }
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
    const fallback = shellFallback();
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((c) => c || caches.match(fallback))),
    );
  }
});
