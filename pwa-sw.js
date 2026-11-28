/* ===== pwa-sw.js · P2-01 — Service worker del modo offline de puerta =====
   Alcance del caché: la PUERTA (puerta.html + su JS + librerias vendor).
   Objetivo: que con red intermitente la app cargue igual y que las llamadas
   RPC fallidas de red caigan en la cola local (js/offline-db.js + js/puerta.js).

   Reglas de caché:
   · PRECACHE en install: shell de puerta (HTML + JS + QR vendor). config.js NO
     entra al precaché (P2-01): su baseUrl/resolución de entorno es dinámica;
     se cachea EN RUNTIME en la primera carga con red, y de ahí en adelante
     sirve desde caché (workaround del repositorio).
   · GET mismo origen: cache-first para lo precacheado; para config.js u otros
     recursos no precacheados, la primera vez es network + copia al caché, y
     después cache-first.
   · POST (todas las RPC de Supabase via fetch): NO se interceptan. Sin red
     fallan -> el catch de js/puerta.js encola el escaneo (idempotencia en el
     servidor).
   · ORIGEN CRUZADO: nunca se cachea.

   IMPORTANTE: al cambiar el contenido de cualquiera de estos archivos, sube
   NA_VERSION_CACHE (v1 → v2 ...) para que el nuevo shell reemplace al viejo.
 */
const NA_VERSION_CACHE = 'v1';
const NA_CACHE = 'nitroacceso-puerta-' + NA_VERSION_CACHE;

const NA_PRECACHE = [
  'puerta.html',
  'js/puerta.js',
  'js/offline-db.js',
  'vendor/jsqr-1.4.0.js',
  'vendor/qrcode-generator-1.4.4.js',
  'vendor/qrcode-generator-1.4.4-utf8.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(NA_CACHE);
    await cache.addAll(NA_PRECACHE);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Borra cachés de versiones anteriores para no acumular shell viejos.
    const nombres = await caches.keys();
    await Promise.all(
      nombres.filter((n) => n !== NA_CACHE).map((n) => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return; // POST = RPC: pasa directo; sin red -> cola.
  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return; // Supabase y otros: nunca cachear.

  event.respondWith((async () => {
    const cache = await caches.open(NA_CACHE);
    // puerta.html puede pedirse con query (?lista=/&v=/&env=): el shell es el
    // mismo archivo, así que si la clave exacta no existe se recurre a
    // ignoreSearch. Los demás assets son únicos por ruta.
    const cached = await cache.match(req)
      || await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      // Runtime: solo config.js (y solo respuestas válidas). El resto no se
      // pedirá por GET aparte o ya está precacheado.
      if (resp && resp.ok && url.pathname.endsWith('/config.js')) {
        await cache.put(req, resp.clone());
      }
      return resp;
    } catch (e) {
      // Sin red y sin caché: respuesta visible de fallo para que nada
      // cuelgue. Para el shell precacheado nunca debería ocurrir.
      return new Response('', {
        status: 504,
        statusText: 'offline (sin caché)',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
