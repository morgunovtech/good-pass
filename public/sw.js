const CACHE_NAME = 'goodpass-v11';
const STATIC_ASSETS = [
  '/',
  '/en/',
  '/styles.css',
  '/app.js',
  '/sw-register.js',
  '/generator.js',
  '/wordlists.js',
  '/history.js',
  '/theme.js',
  '/shortcuts.js',
  '/trainer.js',
  '/export.js',
  '/i18n.js',
  '/locales/ru.json',
  '/locales/en.json',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Other origins — the design system's CSS and fonts on s.morgunov.tech — are
  // left to the browser, which loads them under the page's CSP. The worker's
  // own CSP (connect-src 'self', from _headers) blocks its fetch() to them, so
  // answering them here left returning visitors without styles.
  if (url.origin !== self.location.origin) return;

  // Network-first for API calls.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: 'Offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        })
      )
    );
    return;
  }

  // Cache-first for static assets.
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
