// Service Worker mínimo para desenvolvimento (sem cache)
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    // Não faz nada, apenas garante que o SW ativo
});

self.addEventListener('fetch', (event) => {
    // Sempre busca da rede, sem cache
    event.respondWith(fetch(event.request));
});
