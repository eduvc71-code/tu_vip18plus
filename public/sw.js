// Service Worker for Danii VIP PWA
const CACHE_NAME = 'danii-pwa-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let browser handle network requests normally, fallback to cache if offline
  if (event.request.method !== 'GET') return;
  // Ignore API requests and range streaming requests
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/telegram-media')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
