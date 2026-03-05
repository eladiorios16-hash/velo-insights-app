const CACHE_NAME = 'velo-insights-v1.0';

// Aquí ponemos los archivos vitales de tu diseño para que funcionen sin internet
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/calendario.html',
  '/equipos.html',
  '/glosario.html',
  '/assets/main.css',
  '/layout.js',
  '/renderers.js',
  '/assets/logo-icon.svg',
  '/assets/favicon-144.png'
];

// 1. Instalar la App y guardar los archivos visuales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Velo App] Guardando archivos en caché...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Limpiar versiones antiguas si actualizas la web
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Velo App] Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. Interceptar peticiones (Caché primero para lo visual, Red primero para los datos)
self.addEventListener('fetch', (event) => {
  // Si la petición es a la API de datos (noticias, calendario, etc) -> Buscamos en internet primero
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Si no hay internet, devolvemos lo último que guardamos
        return caches.match(event.request);
      })
    );
    return;
  }

  // Si es un archivo de diseño (html, css, imágenes) -> Buscamos en caché primero
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
