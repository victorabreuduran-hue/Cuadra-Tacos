// La Cuadra Tacos — Service Worker
// ⚠️ IMPORTANTE: cambia este número cada vez que subas cambios a GitHub
const CACHE_VERSION = 'cuadra-tacos-2026-03-18-0652';

const STATIC_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap'
];

// ── INSTALL ──
self.addEventListener('install', event => {
  // Actívate inmediatamente sin esperar a que cierren las pestañas viejas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(STATIC_ASSETS.map(url =>
        new Request(url, { mode: 'no-cors' })
      )).catch(() => {});
    })
  );
});

// ── ACTIVATE: borra caches viejos y toma control inmediato ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── MENSAJE desde la app para forzar actualización ──
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH: estrategia según tipo de recurso ──
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // 🚫 Nunca cachear: Google Apps Script (datos en vivo)
  if (url.includes('script.google.com')) return;

  // 🚫 Nunca cachear: el index.html — siempre descarga la versión más nueva
  if (url.includes('index.html') || url.endsWith('/Cuadra-Tacos/') || url.endsWith('/Cuadra-Tacos')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .catch(() => caches.match(event.request)) // solo usa caché si no hay red
    );
    return;
  }

  // ✅ Fonts y assets estáticos: Cache First (cambian muy poco)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => null);
      })
    );
    return;
  }

  // ✅ Todo lo demás: Network First con fallback a caché
  event.respondWith(
    fetch(event.request, { cache: 'no-cache' })
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// ── PUSH NOTIFICATIONS ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '🌮 La Cuadra Tacos';
  const options = {
    body: data.body || 'Nueva notificación',
    icon: '/Cuadra-Tacos/icon-192.png',
    badge: '/Cuadra-Tacos/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: '/Cuadra-Tacos/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/Cuadra-Tacos/')
  );
});
