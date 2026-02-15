// Service Worker Básico para Velo Insights
const CACHE_NAME = 'velo-insights-v1';

// 1. Instalación: El navegador detecta la app
self.addEventListener('install', (event) => {
    console.log('📱 Velo Insights App: Instalada');
    self.skipWaiting();
});

// 2. Activación
self.addEventListener('activate', (event) => {
    console.log('📱 Velo Insights App: Activa');
});

// 3. Interceptación de red (Necesario para PWA)
// Por ahora dejamos que todo pase directo a internet para no tener problemas de caché
self.addEventListener('fetch', (event) => {
    event.respondWith(fetch(event.request));
});
