const CACHE_NAME = 'velo-insights-v2.0';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/calculadora.html',
  '/calendario.html',
  '/equipos.html',
  '/glosario.html',
  '/assets/main.css',
  '/assets/logo-icon.svg',
  '/assets/favicon-144.png'
];

// 1. Instalar la App (Forzamos a que tome el control inmediatamente)
self.addEventListener('install', (event) => {
  self.skipWaiting(); 
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
});

// 2. Activar y limpiar la basura de la versión 1.0
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

// 3. Estrategia de Interceptación (El secreto para que funcione fluido)
self.addEventListener('fetch', (event) => {
  
  // A. Para llamadas a la Base de Datos (/api/...) -> Red primero, si falla, Caché.
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open('velo-api-cache').then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // B. Para cambiar de sección (Navegación HTML) -> Red primero, si falla, Caché.
  if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clonedResponse = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
          return response;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
    return;
  }

  // C. Para Imágenes, CSS y Scripts -> Caché primero (para que cargue al instante), pero actualizamos por detrás.
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Solo guardamos si es válido
        if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
           caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse.clone()));
        }
        return networkResponse;
      }).catch(() => null);

      return cachedResponse || fetchPromise;
    })
  );
});
