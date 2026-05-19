// ═══════════════════════════════════════════════════
// SYNCRO QUANTUM — Service Worker v1.0
// Cambia CACHE_VERSION a "v2", "v3"... en cada update
// para que los usuarios reciban la nueva versión
// ═══════════════════════════════════════════════════

const CACHE_VERSION = 'syncro-quantum-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ── INSTALL: cachea los archivos al instalar ──────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('[SW] Cacheando archivos...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpia caches viejos automáticamente ───
self.addEventListener('activate', event => {
  console.log('[SW] Activando versión:', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(name => name !== CACHE_VERSION)
            .map(name => {
              console.log('[SW] Eliminando cache viejo:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ── FETCH: red primero, cache como respaldo ──────────
self.addEventListener('fetch', event => {
  // Solo cachear peticiones GET
  if (event.request.method !== 'GET') return;

  // No cachear llamadas a APIs externas (Anthropic, PayPal, etc.)
  const url = new URL(event.request.url);
  if (
    url.hostname.includes('anthropic.com') ||
    url.hostname.includes('paypal.com') ||
    url.hostname.includes('mercadopago.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com')
  ) {
    return; // Dejar pasar sin cachear
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Clonar respuesta para guardarla en cache
        const responseToCache = response.clone();
        caches.open(CACHE_VERSION)
          .then(cache => cache.put(event.request, responseToCache));
        return response;
      })
      .catch(() => {
        // Sin red: usar cache
        return caches.match(event.request)
          .then(cached => {
            if (cached) return cached;
            // Fallback offline
            return new Response(
              '<html><body style="background:#0D1117;color:#F8FAFC;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><div style="font-size:48px;margin-bottom:16px">🌐</div><h2>Sin conexión</h2><p style="color:#94A3B8">Syncro Quantum necesita conexión para funcionar.<br>Vuelve a intentarlo pronto.</p></div></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
      })
  );
});

// ── MENSAJE: forzar actualización desde la app ───────
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
