const CACHE = 'drop-error-screen-v1';
const ASSETS = ['/offline.html', '/assets/not-found.js', '/favicon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('drop-error-screen-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  if (event.request.mode === 'navigate') {
    // Preserve real HTTP statuses, including genuine 404s. Only network failure
    // uses the offline screen; never cache navigation URLs or their room tokens.
    event.respondWith(fetch(event.request).catch(async () => {
      const cached = await caches.match('/offline.html', {cacheName: CACHE});
      if (!cached) return Response.error();
      return new Response(await cached.text(), {status: 503, headers: {'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store'}});
    }));
  } else if (ASSETS.includes(url.pathname) && !url.search) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request, {cacheName: CACHE}).then(response => response || Response.error())));
  }
});
