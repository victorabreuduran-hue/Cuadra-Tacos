// La Cuadra Tacos — Service Worker
// Versión del cache — cambia este número para forzar actualización
const CACHE_VERSION = 'cuadra-tacos-v1';

const ASSETS = [
  '/Cuadra-Tacos/',
  '/Cuadra-Tacos/index.html',
  '/Cuadra-Tacos/manifest.json',
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;800;900&display=swap'
];

// ── INSTALL: guarda todos los archivos en cache ──
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => {
      return cache.addAll(ASSETS.map(url => {
        return new Request(url, { mode: 'no-cors' });
      })).catch(() => {
        // Si algún asset falla, continúa igual
        return cache.addAll(['/Cuadra-Tacos/index.html']);
      });
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: limpia caches viejos ──
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// ── FETCH: sirve desde cache, actualiza en segundo plano ──
self.addEventListener('fetch', event => {
  // Solo cachea GET requests
  if (event.request.method !== 'GET') return;

  // No cachea llamadas al Google Apps Script (datos en vivo)
  if (event.request.url.includes('script.google.com')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        // Solo cachea respuestas válidas
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then(cache => {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(() => null);

      // Devuelve cache inmediatamente si existe, si no espera la red
      return cached || fetchPromise;
    })
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
