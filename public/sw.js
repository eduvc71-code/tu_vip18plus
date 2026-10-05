// ============================================================
// Service Worker — Danii VIP PWA + Cache de media
// Estrategia:
//  - App shell (HTML/JS/CSS): red primero, fallback a cache
//  - Media (/api/telegram-media/, /api/media, /uploads): cache primero
//  - API no-media: pasa directo (sin cache)
// ============================================================

const APP_CACHE = 'danii-pwa-v1';
const MEDIA_CACHE = 'vip-media-v1';

const MEDIA_PATTERNS = [
  /^\/api\/telegram-media\//,
  /^\/api\/media$/,
  /^\/uploads\//
];

const MAX_PREFETCH_ITEMS = 200;
const MAX_ITEM_SIZE_BYTES = 30 * 1024 * 1024; // 30 MB

// --- CICLO DE VIDA ---

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k =>
            (k.startsWith('danii-pwa-') && k !== APP_CACHE) ||
            (k.startsWith('vip-media-') && k !== MEDIA_CACHE)
          )
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// --- INTERCEPTAR PETICIONES ---

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. MEDIA (fotos/videos): cache-first
  const isMedia = MEDIA_PATTERNS.some(p => p.test(url.pathname));
  if (isMedia) {
    if (req.headers.has('range')) return;
    event.respondWith(handleMedia(req));
    return;
  }

  // 2. API no-media → pasar directo (sin cache)
  if (url.pathname.startsWith('/api')) return;

  // 3. App shell (HTML/JS/CSS): red primero, fallback cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});

async function handleMedia(req) {
  const cache = await caches.open(MEDIA_CACHE);
  const cached = await cache.match(req);
  if (cached) return cached;

  try {
    const res = await fetch(req);
    if (res && res.ok && res.status === 200) {
      cache.put(req, res.clone()).catch(() => {});
    }
    return res;
  } catch (err) {
    const fallback = await cache.match(req, { ignoreSearch: true });
    if (fallback) return fallback;
    return new Response('Sin conexión', { status: 503, statusText: 'Offline' });
  }
}

// --- MENSAJES DESDE LA APP ---

self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'PREFETCH_URLS') {
    event.waitUntil(prefetchUrls(data.urls || [], data.requestId || ''));
  }

  if (data.type === 'GET_CACHE_STATS') {
    event.waitUntil(sendStats());
  }
});

async function prefetchUrls(urls, requestId) {
  const cache = await caches.open(MEDIA_CACHE);
  const list = urls.slice(0, MAX_PREFETCH_ITEMS);
  const total = list.length;
  let done = 0;

  for (const url of list) {
    try {
      const already = await cache.match(url);
      if (!already) {
        const res = await fetch(url);
        if (res && res.ok) {
          const len = Number(res.headers.get('content-length') || 0);
          if (len === 0 || len <= MAX_ITEM_SIZE_BYTES) {
            await cache.put(url, res.clone());
          }
        }
      }
    } catch (e) {
      // Fallo puntual no detiene el batch
    }
    done++;
    notifyClients({ type: 'PREFETCH_PROGRESS', requestId, done, total });
  }

  notifyClients({ type: 'PREFETCH_COMPLETE', requestId, total });
}

async function sendStats() {
  try {
    const cache = await caches.open(MEDIA_CACHE);
    const keys = await cache.keys();
    notifyClients({ type: 'CACHE_STATS', count: keys.length });
  } catch {
    notifyClients({ type: 'CACHE_STATS', count: 0 });
  }
}

async function notifyClients(payload) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    try { client.postMessage(payload); } catch {}
  });
}