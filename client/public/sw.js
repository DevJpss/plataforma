const CACHE = 'adulthub-v1';
const ASSETS = [
  '/',
  '/videos',
  '/forum',
  '/lives',
  '/manifest.json',
  '/favicon.svg',
  '/icon-192.svg',
  '/icon-512.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (url.origin === location.origin && ASSETS.includes(url.pathname)) {
    e.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    );
    return;
  }

  if (url.origin === location.origin && url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  e.respondWith(
    fetch(request).catch(() => caches.match('/'))
  );
});
