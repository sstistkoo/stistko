// ╔══════════════════════════════════════════════════════════════╗
// ║  SKICA – Service Worker (PWA offline cache)                 ║
// ╚══════════════════════════════════════════════════════════════╝

const CACHE_NAME = 'skica-v58';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/types.js',
  './js/state.js',
  './js/utils.js',
  './js/bridge.js',
  './js/canvas.js',
  './js/geometry.js',
  './js/render.js',
  './js/objects.js',
  './js/ui.js',
  './js/cnc-calcs.js',
  './js/events.js',
  './js/touch.js',
  './js/dialogs.js',
  './js/storage.js',
  './js/dxf.js',
  './js/app.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: nacachovat všechny assets ──
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ── Activate: smazat staré verze cache ──
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first pro app soubory ──
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Jen GET requesty ze stejného originu
  if (e.request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((resp) => {
        if (resp && resp.status === 200) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone));
        }
        return resp;
      });
    })
  );
});
