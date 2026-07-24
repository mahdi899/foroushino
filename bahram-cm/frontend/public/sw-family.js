const CACHE = 'bahram-family-v8';
const PRECACHE = ['/family-manifest.webmanifest', '/pwa/icon/192', '/pwa/icon/512', '/apple-icon'];

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
    url.pathname.startsWith('/pwa/icon/') ||
    url.pathname.startsWith('/storage/media/') ||
    url.pathname.startsWith('/storage/family/') ||
    /\.(?:svg|png|webp|ico|woff2?|jpg|jpeg)$/i.test(url.pathname)
  );
}

/** Video/voice Range requests must not pass through the SW (breaks metadata + decode). */
function isFamilyMediaStream(url) {
  return url.pathname.startsWith('/media/family/') || url.pathname.startsWith('/media/site/');
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE.map((url) => cache.add(url))).then(() => undefined),
      )
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
            .filter((key) => key.startsWith('bahram-family-') && key !== CACHE)
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

self.addEventListener('push', (event) => {
  let data = {
    title: 'خانواده',
    body: 'امروز پیام‌های جدید در خانواده هست — بیا اپ را باز کن.',
    url: shellFallback(),
    tag: 'family-daily-unread',
    badge: 0,
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    }
  } catch {
    try {
      const text = event.data?.text();
      if (text) data.body = text;
    } catch {
      /* keep defaults */
    }
  }

  const targetUrl = typeof data.url === 'string' && data.url ? data.url : shellFallback();

  event.waitUntil(
    (async () => {
      if (typeof self.registration.setAppBadge === 'function' && data.badge > 0) {
        try {
          await self.registration.setAppBadge(Math.min(Number(data.badge) || 1, 99));
        } catch {
          /* ignore */
        }
      }

      await self.registration.showNotification(data.title || 'خانواده', {
        body: data.body || '',
        icon: '/pwa/icon/192',
        badge: '/pwa/icon/192',
        tag: data.tag || 'family-daily-unread',
        renotify: true,
        data: { url: targetUrl },
        dir: 'rtl',
        lang: 'fa',
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification?.data?.url || shellFallback();

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of allClients) {
        if ('focus' in client) {
          await client.focus();
          if ('navigate' in client && typeof client.navigate === 'function') {
            try {
              await client.navigate(target);
            } catch {
              /* ignore */
            }
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (isNextRuntimeRequest(url) || isApiRequest(url)) return;

  if (isFamilyMediaStream(url)) {
    return;
  }

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
    const fallback = shellFallback();
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request).then((c) => c || caches.match(fallback))),
    );
  }
});
